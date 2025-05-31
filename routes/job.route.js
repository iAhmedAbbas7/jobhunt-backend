// <= IMPORTS =>
import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  deleteJob,
  getAdminJobs,
  getAllJobs,
  getJobById,
  postJob,
  saveJob,
  unsaveJob,
  updateHiredStatus,
  updateJob,
} from "../controllers/job.controller.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.route("/post").post(isAuthenticated, postJob);
router.route("/getAllJobs").get(getAllJobs);
router.route("/getAdminJobs").get(isAuthenticated, getAdminJobs);
router.route("/get/:id").get(isAuthenticated, getJobById);
router.route("/updateHireStatus/:id").patch(isAuthenticated, updateHiredStatus);
router.route("/saveJob/:id").post(isAuthenticated, saveJob);
router.route("/unsaveJob/:id").delete(isAuthenticated, unsaveJob);
router.route("/delete/:id").delete(isAuthenticated, deleteJob);
router.route("/update/:id").put(isAuthenticated, updateJob);

export default router;
