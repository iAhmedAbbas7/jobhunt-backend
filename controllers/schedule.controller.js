// <= IMPORTS =>
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ChatRoom } from "../models/chatRoom.model.js";
import expressAsyncHandler from "express-async-handler";
import { ScheduledMessage } from "../models/scheduledMessage.model.js";

// <= CREATE SCHEDULED MESSAGE =>
export const createScheduledMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const sender = req.id;
  // GETTING ROOM ID FROM REQUEST PARAMS
  const { roomId } = req.params;
  // GETTING TEXT, PARENT IF ANY SEND AT TIME FROM REQUEST BODY
  const { text, parent = null, sendAt } = req.body;
  // FINDING USER IN THE USER MODEL THROUGH SENDER ID
  const foundUser = await User.findById(sender).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // MAKING SURE THE CURRENT USER IS PARTICIPANT OF THE ROOM
  const foundRoom = await ChatRoom.findOne({
    _id: roomId,
    participants: sender,
  }).exec();
  // IF USER IS NOT A PARTICIPANT OF THE ROOM
  if (!foundRoom) {
    return res.status(400).json({ message: "Access Denied!", success: false });
  }
  // CHECKING IF THE TEXT IS NOT EMPTY
  if (!text.trim()) {
    return res
      .status(400)
      .json({ message: "Text is Required!", success: false });
  }
  // CHECKING THE VALIDITY OF ROOM ID
  if (!mongoose.isValidObjectId(roomId)) {
    return res
      .status(400)
      .json({ message: "Invalid Room ID Found!", success: false });
  }
  // CREATING THE SCHEDULED MESSAGE
  const scheduledMessage = await ScheduledMessage.create({
    room: roomId,
    sender,
    text,
    parent,
    sendAt: new Date(sendAt),
  });
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Scheduled Message Created!",
    success: true,
    scheduledMessage,
  });
});

// <= GET SCHEDULED MESSAGES =>
export const listScheduledMessages = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const sender = req.id;
  // GETTING ROOM ID FROM REQUEST PARAMS
  const { roomId } = req.params;
  // GETTING SCHEDULED MESSAGES
  const list = await ScheduledMessage.find({
    room: roomId,
    sender: sender,
    status: "PENDING",
  }).exec();
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, scheduled: list });
});

// <= UPDATE SCHEDULED MESSAGE =>
export const updateScheduledMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const sender = req.id;
  // GETTING MESSAGE ID FROM REQUEST PARAMS
  const { id } = req.params;
  // GETTING NEW TEXT OR SEND AT TIME FROM REQUEST BODY
  const { text, sendAt } = req.body;
  // FINDING THE SCHEDULED MESSAGE THROUGH MESSAGE ID
  const foundMessage = await ScheduledMessage.findOne({
    _id: id,
    sender: sender,
  }).exec();
  // IF SCHEDULED MESSAGE NOT FOUND
  if (!foundMessage) {
    return res
      .status(400)
      .json({ message: "Message Not Found!", success: false });
  }
  // IF THE MESSAGE IS ALREADY SENT OR CANCELLED
  if (foundMessage.status === "SENT" || foundMessage.status === "CANCELLED") {
    return res.status(400).json({
      message: `${
        foundMessage.status === "SENT"
          ? "Message has already been Sent!"
          : "Message has been Cancelled!"
      }`,
      success: false,
    });
  }
  // IF THE TEXT IS BEING CHANGED
  if (text) foundMessage.text = text;
  // IF SENT AT TIME IS BEING CHANGED
  if (sendAt) foundMessage.sendAt = new Date(sendAt);
  // SAVING THE MESSAGE
  await foundMessage.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Message Updated Successfully!",
    success: true,
    scheduled: foundMessage,
  });
});

// <= CANCEL SCHEDULED MESSAGE =>
export const cancelScheduledMessage = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const sender = req.id;
  // GETTING MESSAGE ID FROM REQUEST PARAMS
  const { id } = req.params;
  // FINDING THE SCHEDULED MESSAGE THROUGH MESSAGE ID
  const foundMessage = await ScheduledMessage.findOne({
    _id: id,
    sender: sender,
  }).exec();
  // IF SCHEDULED MESSAGE NOT FOUND
  if (!foundMessage) {
    return res
      .status(400)
      .json({ message: "Message Not Found!", success: false });
  }
  // IF THE MESSAGE IS ALREADY SENT OR CANCELLED
  if (foundMessage.status === "SENT") {
    return res.status(400).json({
      message: "Message has already been Sent!",
      success: false,
    });
  }
  // CANCELLING THE MESSAGE
  foundMessage.status = "CANCELLED";
  // SAVING THE MESSAGE
  await foundMessage.save();
  // DELETING THE MESSAGE
  await foundMessage.deleteOne();
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Message Cancelled Successfully!", success: true });
});
