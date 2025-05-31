// <= IMPORTS =>
import express from "express";
import { singleUpload } from "../middleware/multer.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  clearChat,
  createChatRequest,
  createOrGetRoom,
  deleteForEveryone,
  deleteForMe,
  deleteMessageReaction,
  editMessage,
  getAcceptedChatRequests,
  getChatRequests,
  getMessages,
  getRoomLastSeen,
  getRooms,
  getSentChatRequests,
  getUnreadCounts,
  reactToMessage,
  respondToChatRequest,
  sendMessage,
  starMessage,
  unstarMessage,
} from "../controllers/chat.controller.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.route("/request").post(isAuthenticated, createChatRequest);
router.route("/requests").get(isAuthenticated, getChatRequests);
router.route("/requests/sent").get(isAuthenticated, getSentChatRequests);
router
  .route("/requests/accepted")
  .get(isAuthenticated, getAcceptedChatRequests);
router
  .route("/request/:id/respond")
  .post(isAuthenticated, respondToChatRequest);
router.route("/room").post(isAuthenticated, createOrGetRoom);
router.route("/rooms").get(isAuthenticated, getRooms);
router.route("/room/:roomId/messages").get(isAuthenticated, getMessages);
router.route("/rooms/:roomId/lastSeen").get(isAuthenticated, getRoomLastSeen);
router.route("/rooms/unreadCounts").get(isAuthenticated, getUnreadCounts);
router
  .route("/room/:roomId/message")
  .post(isAuthenticated, singleUpload, sendMessage);
router.route("/message/:messageId/edit").patch(isAuthenticated, editMessage);
router
  .route("/message/:messageId/react")
  .patch(isAuthenticated, reactToMessage);
router;
router
  .route("/message/:messageId/deleteReaction")
  .delete(isAuthenticated, deleteMessageReaction);
router
  .route("/message/:messageId/deleteForMe")
  .delete(isAuthenticated, deleteForMe);
router
  .route("/room/:roomId/message/:messageId/deleteForEveryOne")
  .delete(isAuthenticated, deleteForEveryone);
router.route("/message/:id/star").patch(isAuthenticated, starMessage);
router.route("/message/:id/unstar").patch(isAuthenticated, unstarMessage);
router.route("/room/:roomId/clearChat").delete(isAuthenticated, clearChat);

export default router;
