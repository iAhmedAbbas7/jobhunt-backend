// <= IMPORTS =>
import mongoose from "mongoose";

// <= REPLY SCHEMA =>
const replySchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// <= COMMENT SCHEMA =>
const commentSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Comment Cannot be Empty"],
      trim: true,
      maxlength: 1000,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: [replySchema],
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// <= EXPORTING THE COMMENT SCHEMA =>
export const Comment = mongoose.model("Comment", commentSchema);
