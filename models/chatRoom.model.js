// <= IMPORTS =>
import mongoose from "mongoose";

// <= CHATROOM SCHEMA =>
const chatRoomSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
  },
  { timestamps: true }
);

// <= EXPORTING CHATROOM SCHEMA =>
export const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
