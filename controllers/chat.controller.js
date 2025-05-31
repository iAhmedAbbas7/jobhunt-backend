// <= IMPORTS =>
import mongoose from "mongoose";
import { Job } from "../models/job.model.js";
import getDataURI from "../utils/dataURI.js";
import { User } from "../models/user.model.js";
import cloudinary from "../utils/cloudinary.js";
import { getLinkPreview } from "link-preview-js";
import { Message } from "../models/message.model.js";
import { ChatRoom } from "../models/chatRoom.model.js";
import expressAsyncHandler from "express-async-handler";
import { ChatRequest } from "../models/chatRequest.model.js";
import { Notification } from "../models/notification.model.js";

// <= CREATE CHAT REQUEST =>
export const createChatRequest = expressAsyncHandler(async (req, res) => {
  // GETTING THE ID OF THE USER SENDING CHAT REQUEST
  const from = req.id;
  // DESTRUCTURING THE ID OF THE JOB AND IT'S CREATOR FROM REQUEST BODY
  const { to, job } = req.body;
  // ERROR HANDLING
  if (!to || !job) {
    return res
      .status(400)
      .json({ message: "Job & Recipient ID is Required!", success: false });
  }
  // FINDING THE JOB
  const jobDoc = await Job.findById(job).exec();
  // CHECKING IF THE JOB EXISTS & MATCHING THE SENT ID TO JOB CREATED BY FIELD
  if (!jobDoc || jobDoc.createdBy.toString() !== to) {
    return res
      .status(400)
      .json({ message: "Invalid Job or Recipient", success: false });
  }
  // PREVENTING DUPLICATE PENDING REQUEST
  const existing = await ChatRequest.findOne({
    from,
    to,
    job,
    status: "PENDING",
  });
  // IF EXISTING REQUEST FOUND
  if (existing) {
    return res
      .status(400)
      .json({ message: "You already have a Request Pending", success: false });
  }
  // CREATING CHAT REQUEST
  const chatRequest = await ChatRequest.create({ from, to, job });
  // FINDING USER IN THE USER MODEL TO GET DETAILS
  const requestSender = await User.findById(from).exec();
  // IF NO USER FOUND
  if (!requestSender) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // CREATING NOTIFICATION DATA TO SEND TO THE RECEIVER OF THE CHAT REQUEST
  const notificationData = {
    recipient: to,
    message: `New Chat Request from ${requestSender.fullName} for ${jobDoc.title} Job`,
    link: "/chats/requests",
    isRead: false,
  };
  // CREATING NOTIFICATION
  await Notification.create(notificationData);
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Chat Request Sent Successfully!",
    success: true,
    chatRequest,
  });
});

// <= GET CHAT REQUESTS =>
export const getChatRequests = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ALL CHAT REQUESTS
  const requests = await ChatRequest.find({ to: userId, status: "PENDING" })
    .populate("from", "fullName email profile.profilePhoto")
    .populate("job", "title")
    .exec();
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, requests });
});

// <= GET SENT CHAT REQUESTS =>
export const getSentChatRequests = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ALL CHAT REQUESTS
  const requests = await ChatRequest.find({ from: userId, status: "PENDING" })
    .populate("to", "fullName email profile.profilePhoto")
    .populate("job", "title")
    .exec();
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, requests });
});

// <= GET ACCEPTED CHAT REQUESTS =>
export const getAcceptedChatRequests = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ALL ACCEPTED CHAT REQUESTS FOR THE USER
  const accepted = await ChatRequest.find({ from: userId, status: "ACCEPTED" })
    .populate("to", "fullName profile.profilePhoto")
    .populate("job", "title")
    .exec();
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, acceptedRequests: accepted });
});

// <= RESPOND TO CHAT REQUEST =>
export const respondToChatRequest = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING CHAT ACTION FROM REQUEST BODY (ACCEPTED OR REJECTED)
  const { action } = req.body;
  // GETTING REQUEST ID FROM REQUEST PARAMS
  const { id: reqId } = req.params;
  // CHECKING ACTION VALIDITY
  if (!["ACCEPTED", "REJECTED"].includes(action)) {
    return res
      .status(400)
      .json({ message: "Invalid Action Type", success: false });
  }
  // FINDING THE CHAT REQUEST
  const chatRequest = await ChatRequest.findById(reqId).exec();
  // IF NO CHAT REQUEST FOUND OR THE OWNER DOESN'T MATCH
  if (!chatRequest || chatRequest.to.toString() !== userId) {
    return res
      .status(400)
      .json({ message: "Chat Request Not Found", success: false });
  }
  // UPDATING THE CHAT REQUEST STATUS
  chatRequest.status = action;
  // SAVING CHAT REQUEST
  await chatRequest.save();
  // IF CHAT REQUEST ACCEPTED THEN CREATING A ROOM
  let room = null;
  if (action === "ACCEPTED") {
    room = await ChatRoom.create({
      participants: [chatRequest.from, chatRequest.to],
      job: chatRequest.job,
    });
    // FINDING JOB IN THE JOB MODEL TO GET DETAILS
    const requestJob = await Job.findById(chatRequest.job).exec();
    // IF NO JOB FOUND
    if (!requestJob) {
      return res
        .status(404)
        .json({ message: "Job Not Found!", success: false });
    }
    // FINDING THE USER IN THE USER MODEL FOR REQUEST RESPONSE
    const requestResponder = await User.findById(chatRequest.to).exec();
    // IF NO USER FOUND
    if (!requestResponder) {
      return res
        .status(404)
        .json({ message: "User Not Found!", success: false });
    }
    // CREATING NOTIFICATION DATA TO SEND
    const notificationData = {
      recipient: chatRequest.from,
      message: `${requestResponder.fullName} has Accepted your Chat Request for ${requestJob.title} Job`,
      link: `/chat/room/${room._id}`,
      isRead: false,
    };
    // CREATING NOTIFICATION
    await Notification.create(notificationData);
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: `Chat Request ${action === "ACCEPTED" ? "Accepted" : "Rejected"}`,
    success: true,
    room,
  });
});

// <= CREATE OR GET A ROOM =>
export const createOrGetRoom = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING JOB ID AND OTHER USER ID FROM REQUEST BODY
  const { jobId, otherUserId } = req.body;
  // GETTING THE CURRENT LOGGED IN USER ID
  const me = req.id;
  // ERROR HANDLING
  if (!jobId || !otherUserId) {
    return res
      .status(400)
      .json({ message: "Job and Other User ID is Required!", success: false });
  }
  // CHECKING THE VALIDITY OF THE PASSED ID'S
  if (
    !mongoose.isValidObjectId(jobId) ||
    !mongoose.isValidObjectId(otherUserId)
  ) {
    return res
      .status(400)
      .json({ message: "Invalid ID'S Found!", success: false });
  }
  // MAKING SURE JOB EXISTS
  const job = await Job.findById(jobId).exec();
  // IF JOB NOT FOUND
  if (!job) {
    return res.status(404).json({ message: "Job Not Found!", success: false });
  }
  // MAKING SURE OTHER USER EXISTS
  const other = await User.findById(otherUserId).exec();
  // IF OTHER USER NOT FOUND
  if (!other) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // LOOKING IFF THERE IS ALREADY A ROOM (CHAT) BETWEEN THESE USERS
  let room = await ChatRoom.findOne({
    job: jobId,
    participants: { $all: [me, otherUserId] },
  });
  // IF THERE IS NO CURRENT ROOM
  if (!room) {
    room = await ChatRoom.create({
      job: jobId,
      participants: [me, otherUserId],
    });
  }
  // POPULATING THE ROOM WITH NECESSARY DETAILS
  room = await ChatRoom.findById(room._id)
    .populate("job", "title")
    .populate("participants", "fullName profile.profilePhoto");
  // RETURNING RESPONSE
  return res.json({ success: true, room });
});

// <= GET ALL ROOMS =>
export const getRooms = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING ROOMS FOR CURRENT USER
  let rooms = await ChatRoom.find({ participants: me })
    .sort({ createdAt: -1 })
    .populate("job", "title")
    .populate("participants", "fullName profile.profilePhoto")
    .lean()
    .exec();
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, rooms });
});

// <= GET ROOM'S LAST SEEN =>
export const getRoomLastSeen = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING ROOM ID FROM REQUEST PARAMS
  const { roomId } = req.params;
  // CHECKING THE VALIDITY OF ROOM ID
  if (!mongoose.isValidObjectId(roomId)) {
    return res
      .status(400)
      .json({ message: "Invalid ID Found!", success: false });
  }
  // MAKING SURE THE USER IS IN THAT ROOM
  const room = await ChatRoom.findOne({ _id: roomId, participants: me });
  // IF THE CURRENT ROOM IS NOT THAT ROOM
  if (!room) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // FETCHING THE LAST SEEN FOR PARTICIPANTS
  const users = await User.find(
    { _id: { $in: room.participants } },
    "_id lastSeen"
  ).lean();
  // CREATING THE LAST SEEN OBJECT
  const lastSeen = {};
  users.forEach((user) => {
    // SKIPPING THE CURRENT USER
    if (user._id.toString() !== me) {
      lastSeen[user._id] = user.lastSeen;
    }
  });
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, lastSeen });
});

// <= FETCH MESSAGES FOR A ROOM =>
export const getMessages = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // CREATING OBJECT ID FROM REQUEST ID
  const meId = new mongoose.Types.ObjectId(me);
  // GETTING ROOM ID FROM REQUEST PARAMS
  const { roomId } = req.params;
  // CHECKING THE VALIDITY OF ROOM ID
  if (!mongoose.isValidObjectId(roomId)) {
    return res
      .status(400)
      .json({ message: "Invalid ID Found!", success: false });
  }
  // MAKING SURE THE USER IS IN THAT ROOM
  const room = await ChatRoom.findOne({ _id: roomId, participants: meId });
  // IF THE CURRENT ROOM IS NOT THAT ROOM
  if (!room) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // MARKING ALL UNREAD MESSAGES IN THIS ROOM AS READ BY ME
  await Message.updateMany(
    {
      room: roomId,
      readBy: { $ne: meId },
      isDeletedForEveryone: false,
      deletedFor: { $ne: meId },
    },
    { $push: { readBy: meId } }
  );
  // GETTING MESSAGES FOR THAT ROOM EXCLUDING MESSAGES DELETED FOR ME OR EVERYONE
  const messages = await Message.find({
    room: roomId,
    isDeletedForEveryone: false,
    deletedFor: { $ne: meId },
  })
    .sort({ createdAt: -1 })
    .populate("sender", "fullName profile.profilePhoto")
    .populate("reactions.user")
    .populate({
      path: "parent",
      select: "text sender createdAt",
      populate: { path: "sender", select: "fullName profile.profilePhoto" },
    });
  // BROADCASTING TO ROOM THAT I JUST READ MESSAGES OF
  const io = req.app.get("socketio");
  io.to(roomId).emit("roomMessagesRead", { roomId, userId: me });
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, messages });
});

// <= GET UNREAD COUNTS FOR EACH ROOM =>
export const getUnreadCounts = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // CREATING OBJECT ID FROM REQUEST ID
  const meId = new mongoose.Types.ObjectId(me);
  // MESSAGES AGGREGATE
  const agg = await Message.aggregate([
    {
      $match: {
        readBy: { $ne: meId },
        isDeletedForEveryone: false,
        deletedFor: { $ne: meId },
      },
    },
    {
      $lookup: {
        from: "chatrooms",
        localField: "room",
        foreignField: "_id",
        as: "roomDoc",
      },
    },
    { $unwind: "$roomDoc" },
    {
      $match: {
        "roomDoc.participants": meId,
      },
    },
    { $group: { _id: "$room", count: { $sum: 1 } } },
  ]);
  // INITIALIZING AN EMPTY COUNT OBJECT
  const counts = {};
  // GETTING UNREAD COUNT FOR EACH ROOM
  agg.forEach((g) => {
    counts[g._id] = g.count;
  });
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, counts });
});

// <= POST A NEW MESSAGE =>
export const sendMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const sender = req.id;
  // GETTING ROOM ID FROM REQUEST PARAMS
  const { roomId } = req.params;
  // GETTING TEXT TO SEND FROM REQUEST BODY
  const { text = "", parent = null, location = null } = req.body;
  // IF TEXT NOT FOUND
  if (!text.trim() && !req.file) {
    return res
      .status(400)
      .json({ message: "Message Cannot be Empty!", success: false });
  }
  // CHECKING THE VALIDITY OF THE ROOM ID
  if (!mongoose.isValidObjectId(roomId)) {
    return res
      .status(400)
      .json({ message: "Invalid ID Found", success: false });
  }
  // MAKING SURE THE CURRENT USER IS IN THAT ROOM
  const room = await ChatRoom.findOne({
    _id: roomId,
    participants: sender,
  }).exec();
  // IF THE CURRENT ROOM IS NOT THAT ROOM
  if (!room) {
    return res.status(403).json({ message: "Access Denied", success: false });
  }
  // IF THE MESSAGE IS A REPLY THEN VALIDATING ITS PARENT MESSAGE
  if (parent) {
    // CHECKING THE VALIDITY OF THE PARENT MESSAGE
    if (!mongoose.isValidObjectId(parent)) {
      return res
        .status(403)
        .json({ message: "Invalid Message ID Found!", success: false });
    }
    // FINDING THE PARENT MESSAGE
    const parentMessage = await Message.findById(parent).exec();
    // IF PARENT MESSAGE NOT FOUND
    if (!parentMessage) {
      return res
        .status(404)
        .json({ message: "Message Not Found!", success: false });
    }
  }
  // UTILITY FUNCTION TO GRAB THE FIRST URL IN A STRING
  const extractFirstURL = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };
  // INITIALIZING PREVIEW
  let preview = null;
  // EXTRACTING THE URL FROM TEXT
  const url = extractFirstURL(text);
  // IF URL PRESENT
  if (url) {
    try {
      // ATTEMPTING TO GET SITE METADATA THROUGH LINK PREVIEW
      const data = await getLinkPreview(url, { imagesPropertyType: "og" });
      // SETTING PREVIEW OBJECT PROPERTIES WITH RETURNED DATA
      preview = {
        url: data.url,
        title: data.title || "",
        description: data.description || "",
        image:
          Array.isArray(data.images) && data.images[0] ? data.images[0] : "",
      };
    } catch (error) {
      // ERROR HANDLING
      console.warn("Link-Preview JS Error", error);
    }
  }
  // IF MESSAGE HAS A FILE ATTACHMENT
  let attachments = [];
  if (req.file) {
    // GETTING DATA URI FOR THE FILE
    const fileURI = getDataURI(req.file);
    // UPLOADING TO CLOUDINARY
    const cloudResponse = await cloudinary.uploader.upload(fileURI.content, {
      folder: "chat_attachments",
      resource_type: "auto",
    });
    // PUSHING TO ATTACHMENTS ARRAY
    attachments.push({
      url: cloudResponse.secure_url,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
  }
  // CREATING THE PAYLOAD FOR MESSAGE BODY
  let payload = {
    room: roomId,
    sender,
    text: text.trim(),
    parent,
    readBy: [sender],
    preview,
    attachments,
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
  // IF THE MESSAGE WAS A REPLY THEN PUSHING IT TO PARENT MESSAGE REPLIES
  if (parent) {
    await Message.findByIdAndUpdate(parent, {
      $push: { replies: message._id },
    });
  }
  // POPULATING THE MESSAGE WITH NECESSARY DETAILS
  message = await Message.findById(message._id)
    .populate("sender", "fullName profile.profilePhoto")
    .populate("reactions.user")
    .populate({
      path: "parent",
      select: "text sender createdAt",
      populate: { path: "sender", select: "fullName profile.profilePhoto" },
    });
  // BROADCASTING NEW CHAT MESSAGE EVENT TO THE ROOM
  const io = req.app.get("socketio");
  io.to(roomId).emit("chatMessage", message);
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, message });
});

// <= EDIT MESSAGE =>
export const editMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING THE MESSAGE ID FROM REQUEST PARAMS
  const { messageId } = req.params;
  // GETTING TEXT FROM REQUEST BODY
  const { text } = req.body;
  // CHECKING THE VALIDITY OF THE MESSAGE ID
  if (!mongoose.isValidObjectId(messageId)) {
    return res
      .status(400)
      .json({ message: "Invalid Message ID Found!", success: false });
  }
  // FINDING THE MESSAGE THROUGH MESSAGE ID
  const message = await Message.findById(messageId).exec();
  // IF MESSAGE NOT FOUND
  if (!message) {
    return res
      .status(404)
      .json({ message: "Message Not Found!", success: false });
  }
  // MATCHING THE MESSAGE SENDER'S ID TO THE CURRENT LOGGED IN USER ID
  if (message.sender.toString() !== me) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // ENFORCING THE EDIT LIMIT OF 5 MINUTES
  const fiveMinutes = 5 * 60 * 1000;
  const age = Date.now() - message.createdAt.getTime();
  if (age > fiveMinutes) {
    return res
      .status(403)
      .json({ message: "Edit Window Expired - (5 - Minutes)", success: false });
  }
  // EDITING THE MESSAGE TEXT
  message.text = text;
  // UPDATING THE EDITED FLAG
  message.edited = true;
  // SAVING THE MESSAGE
  await message.save();
  // POPULATING THE MESSAGE TO SEND BACK IN RESPONSE
  const populatedMessage = await message.populate(
    "sender",
    "fullName profile.profilePhoto"
  );
  // BROADCASTING THE EDITED MESSAGE EVENT TO THE ROOM
  const io = req.app.get("socketio");
  // EMITTING THE EVENT
  io.to(message.room.toString()).emit("messageEdited", populatedMessage);
  // RETURNING RESPONSE
  return res.status(200).json({ message: "Message Edited!", success: true });
});

// <= REACT TO A MESSAGE =>
export const reactToMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING MESSAGE ID FROM REQUEST PARAMS
  const { messageId } = req.params;
  // GETTING REACTION EMOJI FROM REQUEST BODY
  const { emoji } = req.body;
  // CHECKING THE VALIDITY OF THE MESSAGE ID
  if (!mongoose.isValidObjectId(messageId)) {
    return res
      .status(400)
      .json({ message: "Invalid Message ID Found!", success: false });
  }
  // FINDING THE MESSAGE THROUGH MESSAGE ID
  const message = await Message.findById(messageId).exec();
  // IF MESSAGE NOT FOUND
  if (!message) {
    return res
      .status(404)
      .json({ message: "Message Not Found!", success: false });
  }
  // REMOVING ANY PREVIOUS REACTION BY ME
  message.reactions = message.reactions.filter((r) => r.user.toString() !== me);
  // ADDING MY NEW REACTION
  message.reactions.push({ user: me, emoji });
  // SAVING THE MESSAGE
  await message.save();
  // POPULATING THE MESSAGE
  const populatedMessage = await Message.findById(messageId)
    .populate("sender", "fullName profile.profilePhoto")
    .populate("reactions.user")
    .populate({
      path: "parent",
      select: "text sender createdAt",
      populate: { path: "sender", select: "fullName profile.profilePhoto" },
    });
  // BROADCASTING THE REACTION EVENT IN THE ROOM
  const io = req.app.get("socketio");
  io.to(message.room.toString()).emit("messageReacted", populatedMessage);
  // RETURNING RESPONSE
  return res.status(200).json({ message: "Reaction Added!", success: true });
});

// <= DELETE MESSAGE REACTION =>
export const deleteMessageReaction = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING MESSAGE ID FROM REQUEST PARAMS
  const { messageId } = req.params;
  // CHECKING THE VALIDITY OF THE MESSAGE ID
  if (!mongoose.isValidObjectId(messageId)) {
    return res
      .status(400)
      .json({ message: "Invalid Message ID Found!", success: false });
  }
  // FINDING THE MESSAGE THROUGH MESSAGE ID
  const message = await Message.findById(messageId).exec();
  // IF MESSAGE NOT FOUND
  if (!message) {
    return res
      .status(404)
      .json({ message: "Message Not Found!", success: false });
  }
  // REMOVING THE REACTION BY ME
  message.reactions = message.reactions.filter((r) => r.user.toString() !== me);
  // SAVING THE MESSAGE
  await message.save();
  // POPULATING THE MESSAGE
  const populatedMessage = await Message.findById(messageId)
    .populate("sender", "fullName profile.profilePhoto")
    .populate("reactions.user")
    .populate({
      path: "parent",
      select: "text sender createdAt",
      populate: { path: "sender", select: "fullName profile.profilePhoto" },
    });
  // BROADCASTING THE REACTION EVENT IN THE ROOM
  const io = req.app.get("socketio");
  io.to(message.room.toString()).emit("messageReacted", populatedMessage);
  // RETURNING RESPONSE
  return res.status(200).json({ message: "Reaction Removed!", success: true });
});

// <= DELETE MESSAGE FOR ME =>
export const deleteForMe = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING AND MESSAGE ID FROM REQUEST PARAMS
  const { messageId } = req.params;
  // FINDING THE MESSAGE IN THE MESSAGE MODEL
  const message = await Message.findById(messageId).exec();
  // IF MESSAGE NOT FOUND
  if (!message) {
    return res
      .status(404)
      .json({ message: "Message Not Found!", success: false });
  }
  // MATCHING THE MESSAGE SENDER'S ID TO THE LOGGED IN USER ID
  if (message.sender.toString() !== me.toString()) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // VERIFYING THE USER IS IN THE CHAT ROOM
  const room = await ChatRoom.findOne({
    _id: message.room,
    participants: me,
  });
  // IF ROOM NOT FOUND
  if (!room) {
    return res.status(403).json({
      message: "You are not a Participant in this Room!",
      success: false,
    });
  }
  // MARKING THE MESSAGE AS DELETED FOR THE CURRENT USER
  await Message.findByIdAndUpdate(messageId, {
    $addToSet: { deletedFor: me },
  });
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Message Deleted Successfully!", success: true });
});

// <= DELETE MESSAGE FOR EVERYONE =>
export const deleteForEveryone = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING ROOM ID AND MESSAGE ID FROM REQUEST PARAMS
  const { roomId, messageId } = req.params;
  // FINDING THE MESSAGE IN THE MESSAGE MODEL
  const message = await Message.findById(messageId).exec();
  // IF MESSAGE NOT FOUND
  if (!message) {
    return res
      .status(404)
      .json({ message: "Message Not Found!", success: false });
  }
  // MATCHING THE MESSAGE SENDER'S ID TO THE LOGGED IN USER ID
  if (message.sender.toString() !== me.toString()) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // VERIFYING THE USER IS IN THE CHAT ROOM
  const room = await ChatRoom.findOne({
    _id: message.room,
    participants: me,
  });
  // IF ROOM NOT FOUND
  if (!room) {
    return res.status(403).json({
      message: "You are not a Participant in this Room!",
      success: false,
    });
  }
  // DELETING MESSAGE FOR EVERYONE
  message.isDeletedForEveryone = true;
  // SAVING THE MESSAGE
  await message.save();
  // BROADCASTING MESSAGE REMOVAL EVENT IN THE ROOM
  const io = req.app.get("socketio");
  // EMITTING DELETION EVENT
  io.to(roomId).emit("messageDeleted", { messageId });
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Message Deleted for Everyone!", success: true });
});

// <= CLEAR CHAT =>
export const clearChat = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const me = req.id;
  // GETTING ROOM ID FROM REQUEST PARAMS
  const { roomId } = req.params;
  // CLEARING CHAT FOR THE USER
  await Message.updateMany(
    { room: roomId, deletedFor: { $ne: me } },
    { $addToSet: { deletedFor: me } }
  );
  // RETURNING RESPONSE
  return res.status(200).json({ message: "Chat Cleared!", success: true });
});

// <= STAR MESSAGE =>
export const starMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING MESSAGE ID FROM REQUEST PARAMS
  const { id: messageId } = req.params;
  // CHECKING THE VALIDITY OF THE MESSAGE ID
  if (!mongoose.isValidObjectId(messageId)) {
    return res
      .status(400)
      .json({ message: "Invalid Message ID Found!", success: false });
  }
  // FINDING THE MESSAGE IN THE MESSAGE MODEL
  const foundMessage = await Message.findById(messageId).exec();
  // IF MESSAGE NOT FOUND
  if (!foundMessage) {
    return res
      .status(404)
      .json({ message: "Message Not Found!", success: false });
  }
  // UPDATING THE MESSAGE
  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { starredBy: userId } },
    { new: true }
  );
  // POPULATING THE MESSAGE
  const populatedMessage = await Message.findById(messageId)
    .populate("sender", "fullName profile.profilePhoto")
    .populate("reactions.user")
    .populate({
      path: "parent",
      select: "text sender createdAt",
      populate: { path: "sender", select: "fullName profile.profilePhoto" },
    });
  // BROADCASTING THE MESSAGE STARRED EVENT IN THE ROOM
  const io = req.app.get("socketio");
  io.to(updatedMessage.room.toString()).emit(
    "messageStarred",
    populatedMessage
  );
  // RETURNING RESPONSE
  res.status(200).json({
    message: "Message Starred!",
    success: true,
    messageObj: populatedMessage,
  });
});

// <= UN-STAR MESSAGE =>
export const unstarMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING MESSAGE ID FROM REQUEST PARAMS
  const { id: messageId } = req.params;
  // CHECKING THE VALIDITY OF THE MESSAGE ID
  if (!mongoose.isValidObjectId(messageId)) {
    return res
      .status(400)
      .json({ message: "Invalid Message ID Found!", success: false });
  }
  // FINDING THE MESSAGE IN THE MESSAGE MODEL
  const foundMessage = await Message.findById(messageId).exec();
  // IF MESSAGE NOT FOUND
  if (!foundMessage) {
    return res
      .status(404)
      .json({ message: "Message Not Found!", success: false });
  }
  // UPDATING THE MESSAGE
  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    { $pull: { starredBy: userId } },
    { new: true }
  );
  // POPULATING THE MESSAGE
  const populatedMessage = await Message.findById(messageId)
    .populate("sender", "fullName profile.profilePhoto")
    .populate("reactions.user")
    .populate({
      path: "parent",
      select: "text sender createdAt",
      populate: { path: "sender", select: "fullName profile.profilePhoto" },
    });
  // BROADCASTING THE MESSAGE STARRED EVENT IN THE ROOM
  const io = req.app.get("socketio");
  io.to(updatedMessage.room.toString()).emit(
    "messageStarred",
    populatedMessage
  );
  // RETURNING RESPONSE
  res.status(200).json({
    message: "Message Un-Starred!",
    success: true,
    messageObj: populatedMessage,
  });
});
