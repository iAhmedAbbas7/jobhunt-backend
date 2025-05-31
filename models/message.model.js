// <= IMPORTS =>
import mongoose from "mongoose";

// <= REACTION SCHEMA =>
const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

// <= URL PREVIEW SCHEMA =>
const previewSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    image: String,
    url: String,
  },
  { _id: false }
);

// <= CHAT ATTACHMENTS SCHEMA =>
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
  },
  { _id: false }
);

// <= LOCATION SCHEMA =>
const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

// <= MESSAGE SCHEMA =>
const messageSchema = new mongoose.Schema(
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
    text: {
      type: String,
    },
    edited: { type: Boolean, default: false },
    deletedFor: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    isDeletedForEveryone: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    reactions: [reactionSchema],
    preview: previewSchema,
    location: { type: locationSchema, default: null },
    attachments: [attachmentSchema],
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// <= EXPORTING MESSAGE SCHEMA =>
export const Message = mongoose.model("Message", messageSchema);
