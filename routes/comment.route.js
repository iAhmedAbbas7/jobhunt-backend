// <= IMPORTS =>
import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  createComment,
  deleteComment,
  deleteReply,
  dislikeComment,
  dislikeReply,
  editComment,
  editReply,
  getCommentsForArticle,
  likeComment,
  likeReply,
  pinComment,
  pinReply,
  replyToComment,
} from "../controllers/comment.controller.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.post(
  "/:commentId/reply/:replyId/dislike",
  isAuthenticated,
  dislikeReply
);
router.get("/article/:articleId", getCommentsForArticle);
router.patch("/:commentId", isAuthenticated, editComment);
router.post("/:commentId/pin", isAuthenticated, pinComment);
router.post("/postComment", isAuthenticated, createComment);
router.delete("/:commentId", isAuthenticated, deleteComment);
router.post("/:commentId/like", isAuthenticated, likeComment);
router.post("/:commentId/reply", isAuthenticated, replyToComment);
router.post("/:commentId/dislike", isAuthenticated, dislikeComment);
router.patch("/:commentId/reply/:replyId", isAuthenticated, editReply);
router.post("/:commentId/reply/:replyId/pin", isAuthenticated, pinReply);
router.delete("/:commentId/reply/:replyId", isAuthenticated, deleteReply);
router.post("/:commentId/reply/:replyId/like", isAuthenticated, likeReply);

export default router;
