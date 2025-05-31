// <= IMPORTS =>
import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  cancelScheduledMessage,
  createScheduledMessage,
  listScheduledMessages,
  updateScheduledMessage,
} from "../controllers/schedule.controller.js";

// <= ROUTER =>
const router = express.Router();

// <= USING AUTHENTICATION MIDDLEWARE =>
router.use(isAuthenticated);

// <= ROUTES =>
router.post("/:roomId", createScheduledMessage);
router.get("/:roomId", listScheduledMessages);
router.patch("/:id", updateScheduledMessage);
router.delete("/:id", cancelScheduledMessage);

export default router;
