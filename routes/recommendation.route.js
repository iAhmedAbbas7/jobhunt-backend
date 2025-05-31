// <= IMPORTS =>
import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import expressAsyncHandler from "express-async-handler";
import { getRecommendedJobs } from "../services/recommendationService.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.get(
  "/jobs",
  isAuthenticated,
  expressAsyncHandler(async (req, res) => {
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    try {
      const recommendedJobs = await getRecommendedJobs(userId);
      res.status(200).json({ success: true, jobs: recommendedJobs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

export default router;
