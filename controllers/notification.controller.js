// <= IMPORTS =>
import expressAsyncHandler from "express-async-handler";
import { Notification } from "../models/notification.model.js";

// <= GET NOTIFICATIONS =>
export const getNotifications = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING THE NOTIFICATIONS FOR THE USER
  const notifications = await Notification.find({ recipient: userId }).sort({
    createdAt: -1,
  });
  // IF NO NOTIFICATIONS
  if (!notifications) {
    return res
      .status(404)
      .json({ message: "No Notifications Available", success: false });
  }
  // RETURNING RESPONSE
  res.status(200).json({ notifications, success: true });
});

// <= CLEAR NOTIFICATIONS =>
export const clearNotifications = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING & DELETING NOTIFICATIONS FOR THE USER
  await Notification.deleteMany({ recipient: userId });
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Notifications Cleared Successfully!", success: true });
});

// <= MARK NOTIFICATION AS READ =>
export const markNotificationAsRead = expressAsyncHandler(async (req, res) => {
  // GETTING NOTIFICATION ID FROM REQUEST PARAMS
  const { id } = req.params;
  // FINDING THE NOTIFICATION THROUGH ID
  const notification = await Notification.findById(id).exec();
  // IF NO NOTIFICATION FOUND
  if (!notification) {
    return res
      .status(404)
      .json({ message: "Notification Not Found", success: false });
  }
  // CHANGING THE IS READ FLAG
  notification.isRead = true;
  // SAVING THE NOTIFICATION
  await notification.save();
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Notification Mark as Read!", success: true });
});

// <= DELETE NOTIFICATION =>
export const deleteNotification = expressAsyncHandler(async (req, res) => {
  // GETTING NOTIFICATION ID FROM REQUEST PARAMS
  const { id } = req.params;
  // IF NO ID AVAILABLE
  if (!id) {
    return res
      .status(400)
      .json({ message: "Notification ID is Required!", success: false });
  }
  // DELETING NOTIFICATION
  const deletedNotification = await Notification.findByIdAndDelete(id);
  // IF NOTIFICATION NOT FOUND
  if (!deletedNotification) {
    return res
      .status(404)
      .json({ message: "Notification Not Found!", success: false });
  }
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Notification Deleted Successfully!", success: true });
});
