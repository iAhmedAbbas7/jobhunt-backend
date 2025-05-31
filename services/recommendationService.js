// <= IMPORTS =>
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { computeSimilarityScore } from "../utils/similarity.js";

/**
 * RECOMMENDATION HELPER FUNCTION SORTING JOBS ACCORDING TO USER'S SKILLS
 * @param {String} userId - The ID of the Logged In User
 * @returns Jobs that Match the User Profile Skills
 */
// <= GET RECOMMENDED JOBS =>
export const getRecommendedJobs = async (userId) => {
  // FETCHING THE USER'S PROFILE INFO THROUGH USER ID
  const user = await User.findById(userId).lean();
  // IF NO USER FOUND
  if (!user) {
    throw new Error("User Not Found!");
  }
  // GETTING USER'S SKILLS
  const userSkills = user.profile?.skills || [];
  // FETCHING ALL JOBS
  const jobs = await Job.find({}).populate("company").lean();
  // CALCULATING THE SIMILARITY SCORE BETWEEN USER AND JOBS
  const recommendations = jobs
    .map((job) => {
      // JOBS REQUIRED SKILLS
      const jobSkills = job.requirements || [];
      // SIMILARITY
      const similarity = computeSimilarityScore(userSkills, jobSkills);
      return {
        job,
        similarity,
      };
    })
    .filter((rec) => rec.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity);
  // RETURNING RECOMMENDED JOBS
  return recommendations.map((rec) => rec.job);
};
