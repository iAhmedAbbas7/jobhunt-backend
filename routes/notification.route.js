// <= IMPORTS =>
import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  clearNotifications,
  deleteNotification,
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.route("/getNotifications").get(isAuthenticated, getNotifications);
router.route("/clearNotifications").delete(isAuthenticated, clearNotifications);
router.route("/markAsRead/:id").patch(isAuthenticated, markNotificationAsRead);
router
  .route("/deleteNotification/:id")
  .delete(isAuthenticated, deleteNotification);

export default router;
