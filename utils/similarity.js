// <= RECOMMENDATION SIMILARITY SCORE HELPER FUNCTION =>
/**
 * COMPUTES A SIMILARITY SCORE BETWEEN TWO ARRAYS
 * @param {Array} userSkills - Array of User Skills
 * @param {Array} jobSkills - Array of Job Required Skills
 * @returns {number}  Score Between 0 & 1
 */
export const computeSimilarityScore = (userSkills, jobSkills) => {
  // IF THERE ARE NO SKILLS TO COMPARE
  if (
    !Array.isArray(userSkills) ||
    !Array.isArray(jobSkills) ||
    userSkills.length === 0
  ) {
    return 0;
  }
  // CHECKING FOR COMMON SKILLS
  const commonSkills = userSkills.filter((skill) =>
    jobSkills
      .map((s) => s.toLowerCase().trim())
      .includes(skill.toLowerCase().trim())
  );
  // RETURNING SIMILARITY SCORE
  return commonSkills.length / userSkills.length;
};
