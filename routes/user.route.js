// <= IMPORTS =>
import express from "express";
import {
  changePassword,
  deleteAvatar,
  deleteResume,
  deleteUser,
  disableTwoFactorAuthentication,
  enableTwoFactorAuthentication,
  finalizeEmailUpdate,
  forgotPassword,
  getSavedJobs,
  initiateChangePassword,
  initiateNewEmailUpdate,
  login,
  logout,
  register,
  requestDisableTwoFactorAuthentication,
  requestEmailUpdateVerification,
  requestEnableTwoFactorAuthentication,
  resetPassword,
  sendDeleteVerificationEmailToUser,
  updateProfile,
  updateResume,
  uploadAvatar,
  verify2FALogin,
  verifyDeletionCode,
  verifyDisableTwoFactorAuthentication,
  verifyEmail,
  verifyTwoFactorAuthentication,
} from "../controllers/user.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { singleUpload } from "../middleware/multer.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.route("/register").post(singleUpload, register);
router.route("/verifyEmail").post(verifyEmail);
router
  .route("/enable-2FA/request")
  .post(isAuthenticated, requestEnableTwoFactorAuthentication);
router
  .route("/enable-2FA/start")
  .post(isAuthenticated, enableTwoFactorAuthentication);
router
  .route("/enable-2FA/verify")
  .post(isAuthenticated, verifyTwoFactorAuthentication);
router
  .route("/disable-2FA/request")
  .post(isAuthenticated, requestDisableTwoFactorAuthentication);
router
  .route("/disable-2FA/start")
  .post(isAuthenticated, verifyDisableTwoFactorAuthentication);
router
  .route("/disable-2FA/verify")
  .post(isAuthenticated, disableTwoFactorAuthentication);
router.route("/login").post(login);
router.route("/verify-2FA-login").post(verify2FALogin);
router.route("/logout").get(logout);
router
  .route("/profile/update")
  .post(isAuthenticated, singleUpload, updateProfile);
router
  .route("/avatar/upload")
  .post(isAuthenticated, singleUpload, uploadAvatar);
router.route("/avatar/delete").delete(isAuthenticated, deleteAvatar);
router
  .route("/resume/upload")
  .post(singleUpload, isAuthenticated, updateResume);
router.route("/resume/delete").delete(isAuthenticated, deleteResume);
router.route("/savedJobs").get(isAuthenticated, getSavedJobs);
router
  .route("/sendDeletionVerificationEmail")
  .post(isAuthenticated, sendDeleteVerificationEmailToUser);
router.route("/verifyDeletionCode").post(isAuthenticated, verifyDeletionCode);
router.route("/delete").delete(isAuthenticated, deleteUser);
router
  .route("/changePassword/initiate")
  .post(isAuthenticated, initiateChangePassword);
router.route("/changePassword").patch(isAuthenticated, changePassword);
router.route("/forgotPassword").post(forgotPassword);
router.route("/resetPassword").post(resetPassword);
router
  .route("/requestEmailUpdate")
  .post(isAuthenticated, requestEmailUpdateVerification);
router
  .route("/initiateNewEmailUpdate")
  .post(isAuthenticated, initiateNewEmailUpdate);
router.route("/finalizeEmailUpdate").post(isAuthenticated, finalizeEmailUpdate);

export default router;
