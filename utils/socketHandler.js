// <= IMPORTS =>
import { User } from "../models/user.model.js";
import { getLinkPreview } from "link-preview-js";
import { Message } from "../models/message.model.js";
import socketAuth from "../middleware/socketAuth.js";

// <= MAIN SOCKET CONNECTION HANDLER =>
const initializeSocket = (io) => {
  // <= ONLINE SOCKETS =>
  const onlineSockets = new Map();
  // <= SOCKET AUTH MIDDLEWARE =>
  io.use(socketAuth);
  // <= LISTENER FOR SOCKET.IO CLIENT CONNECTIONS =>
  io.on("connection", (socket) => {
    // SOCKET CONNECTION
    console.log(`Socket Connected : ${socket.id} (User : ${socket.userId})`);
    // GETTING THE USER'S ID FROM SOCKET REQUEST
    const uId = socket.userId;
    // IF THERE IS A USER CONNECTED
    if (uId) {
      // CONFIGURING THE SOCKET TO ADD TO THE USER'S SET
      let set = onlineSockets.get(uId);
      if (!set) {
        set = new Set();
        onlineSockets.set(uId, set);
        // BROADCASTING THE USER STATUS EVENT
        io.emit("userStatus", { userId: uId, status: "Online" });
      }
      // ADDING THE SOCKET TO THE USER'S SET
      set.add(socket.id);
    }
    // SENDING THE FULL LIST OF ONLINE USERS TO THE CONNECTED SOCKET
    socket.emit("initialOnlineUsers", Array.from(onlineSockets.keys()));
    // WHENEVER A USER CONNECTS, WE NEED TO CHANGE THEIR LAST SEEN TIME
    if (uId) {
      // FINDING THE USER IN THE USER MODEL THROUGH USER ID & UPDATING THEIR LAST SEEN TIME
      User.findByIdAndUpdate(uId, { lastSeen: new Date() }).catch(
        console.error
      );
      // BROADCASTING GLOBALLY
      io.emit("userLastSeen", {
        userId: uId,
        lastSeen: new Date().toISOString(),
      });
    }
    // JOINING A CHAT ROOM
    socket.on("joinChatRoom", (roomId) => {
      // REMEMBERING THIS ROOM
      socket.currentRoom = roomId;
      // JOINING THE SOCKET TO THE ROOM
      socket.join(roomId);
      // LOGGING THE EVENT
      console.log(`Socket ${socket.id} Joined Chat Room ${roomId}`);
      // NOTIFYING EVERYONE IN THE ROOM THE THAT THE USER IS IN THE ROOM
      io.to(roomId).emit("userInRoom", {
        userId: socket.userId,
        inRoom: true,
      });
      // NOTIFYING THE USER ALREADY IN THE ROOM
      const clients = io.sockets.adapter.rooms.get(roomId) || new Set();
      // GETTING SOCKET ID FOR ALL CLIENTS
      for (const sid of clients) {
        // SKIPPING FOR THE USER ALREADY IN THE ROOM
        if (sid === socket.id) continue;
        // SETTING THE SOCKET
        const s = io.sockets.sockets.get(sid);
        // IF THE NEW USER JOINS
        if (s && s.userId) {
          socket.emit("userInRoom", {
            userId: s.userId,
            inRoom: true,
          });
        }
      }
    });
    // RECEIVE A CHAT MESSAGE, PERSIST IT AND BROADCAST IT BACK
    socket.on(
      "sendChatMessage",
      async ({ roomId, senderId, text, parent, location }) => {
        try {
          // EXTRACTING THE FIRST URL FROM THE MESSAGE
          const matchedURL = text.match(/(https?:\/\/[^\s]+)/i);
          // SETTING THE URL
          const url = matchedURL ? matchedURL[0] : null;
          // FETCHING THE OG SITE DATE FOR THE PREVIEW
          let preview = null;
          // IF URL FOUND IN THE MESSAGE TEXT
          if (url) {
            try {
              // ATTEMPTING TO GET SITE METADATA THROUGH LINK PREVIEW
              const data = await getLinkPreview(url, {
                imagesPropertyType: "og",
              });
              // SETTING PREVIEW OBJECT PROPERTIES WITH RETURNED DATA
              preview = {
                url: data.url,
                title: data.title || "",
                description: data.description || "",
                image:
                  Array.isArray(data.images) && data.images[0]
                    ? data.images[0]
                    : "",
              };
            } catch (error) {
              // ERROR HANDLING
              console.warn("Link-Preview JS Error", error);
            }
          }
          // PERSISTING THE MESSAGE
          let payload = {
            room: roomId,
            sender: senderId,
            text,
            parent,
            readBy: [senderId],
            preview,
          };
          // IF LOCATION WAS PASSED IN THE REQUEST BODY
          if (location && location.lat && location.lng && location.name) {
            // ADDING THE LOCATION OBJECT IN THE PAYLOAD
            payload.location = {
              lat: Number(location.lat),
              lng: Number(location.lng),
              name: String(location.name),
            };
          }
          // CREATING THE MESSAGE WITH THE PAYLOAD
          let message = await Message.create(payload);
          // POPULATING THE MESSAGE
          message = await Message.findById(message._id)
            .populate("sender", "fullName, profile.profilePhoto")
            .populate("reactions.user")
            .populate({
              path: "parent",
              select: "text sender createdAt",
              populate: {
                path: "sender",
                select: "fullName profile.profilePhoto",
              },
            });
          // DETERMINING WHO IS IN THE ROOM AND MARK THEM READ INSTANTLY
          const clients = io.sockets.adapter.rooms.get(roomId) || new Set();
          // CONSTRUCTING THE SET OF CURRENT SOCKETS IN THE ROOM
          const presentUserIds = [];
          for (const sockId of clients) {
            const s = io.sockets.sockets.get(sockId);
            if (s && s.userId && s.userId !== senderId) {
              presentUserIds.push(s.userId);
            }
          }
          // IF THE OTHER PARTICIPANT IS IN THE ROOM THEN UPDATING READ STATUS IMMEDIATELY
          if (presentUserIds.length) {
            await Message.updateOne(
              { _id: message._id },
              { $addToSet: { readBy: presentUserIds } }
            );
            // RE-FETCHING THE MESSAGE AGAIN WITH UPDATED READ BY PROPERTY
            message = await Message.findById(message._id)
              .populate("sender", "fullName profile.profilePhoto")
              .populate("reactions.user")
              .populate({
                path: "parent",
                select: "text sender createdAt",
                populate: {
                  path: "sender",
                  select: "fullName profile.profilePhoto",
                },
              });
          }
          message = await Message.findById(message._id)
            .populate("sender", "fullName profile.profilePhoto")
            .populate("reactions.user")
            .populate({
              path: "parent",
              select: "text sender createdAt",
              populate: {
                path: "sender",
                select: "fullName profile.profilePhoto",
              },
            });
          // BROADCASTING TO EVERYONE IN CHAT ROOM
          io.to(roomId).emit("chatMessage", message);
          // EMITTING REAL TIME NOTIFICATION FOR USER IF THEY ARE NOT IN THE ROOM
          for (const [id, s] of io.sockets.sockets) {
            if (!clients.has(id) && s.userId !== senderId) {
              s.emit("newMessageNotification", message);
            }
          }
        } catch (error) {
          console.log("Error Sending Message", error);
        }
      }
    );
    // MARKING AN ENTIRE ROO READ BY THE USER
    socket.on("markRoomRead", async ({ roomId, userId }) => {
      try {
        await Message.updateMany(
          { room: roomId, readBy: { $ne: userId } },
          { $push: { readBy: userId } }
        );
        // NOTIFYING EVERYONE IN THE ROOM WHO JUST READ MESSAGES
        io.to(roomId).emit("roomMessagesRead", { roomId, userId });
      } catch (error) {
        console.error("Error Marking Room Read", error);
      }
    });
    // TYPING EVENT
    socket.on("typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("typing", { roomId, userId });
    });
    // STOP TYPING EVENT
    socket.on("stopTyping", ({ roomId, userId }) => {
      socket.to(roomId).emit("stopTyping", { roomId, userId });
    });
    // ON SOCKET DISCONNECTION
    socket.on("disconnect", () => {
      // SOCKET DISCONNECTED MESSAGE
      console.log(`Socket Disconnected : ${socket.id}`);
      // EMITTING USER LEFT ROOM EVENT
      const roomId = socket.currentRoom;
      // IF ROOM ID EXISTS
      if (roomId) {
        io.to(roomId).emit("userInRoom", {
          userId: socket.userId,
          inRoom: false,
        });
      }
      // GETTING THE USER'S ID FROM SOCKET REQUEST
      const uId = socket.userId;
      // IF THE USER ID EXISTS
      if (uId) {
        const set = onlineSockets.get(uId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            onlineSockets.delete(uId);
            io.emit("userStatus", { userId: uId, status: "Offline" });
            // UPDATING THE USER'S LAST SEEN TIME
            const timeStamp = new Date();
            // FINDING THE USER IN THE USER MODEL WITH USER ID AND UPDATING THEIR LAST SEEN TIME
            User.findByIdAndUpdate(uId, { lastSeen: timeStamp }).catch(
              console.error
            );
            // BROADCASTING GLOBALLY
            io.emit("userLastSeen", {
              userId: uId,
              lastSeen: timeStamp.toISOString(),
            });
          }
        }
      }
    });
  });
};

export default initializeSocket;
