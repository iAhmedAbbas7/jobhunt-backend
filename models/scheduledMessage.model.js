// <= IMPORTS =>
import mongoose from "mongoose";

// <= SCHEDULED MESSAGE SCHEMA =>
const scheduledMessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    sendAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

// <= EXPORTING SCHEDULED MESSAGE SCHEMA =>
export const ScheduledMessage = mongoose.model(
  "ScheduledMessage",
  scheduledMessageSchema
);
