// <= IMPORTS =>
import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  applyJob,
  getAppliedJobs,
  getBestMatchedApplicants,
  jobApplicants,
  updateApplicationStatus,
} from "../controllers/application.controller.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.route("/apply/:id").get(isAuthenticated, applyJob);
router.route("/get").get(isAuthenticated, getAppliedJobs);
router.route("/:id/applicants").get(isAuthenticated, jobApplicants);
router
  .route("/status/:id/update")
  .post(isAuthenticated, updateApplicationStatus);
router
  .route("/:id/bestMatchedApplicants")
  .get(isAuthenticated, getBestMatchedApplicants);
export default router;
