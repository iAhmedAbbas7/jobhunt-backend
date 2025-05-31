// <= IMPORTS =>
import {
  sendApplicationConfirmationEmail,
  sendApplicationStatusEmail,
  sendNewApplicantHiredEmail,
  sendNewApplicationEmail,
} from "../utils/mailer.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import expressAsyncHandler from "express-async-handler";
import { Application } from "../models/application.model.js";
import { Notification } from "../models/notification.model.js";

// <= APPLY JOB =>
export const applyJob = expressAsyncHandler(async (req, res) => {
  // LOGGED IN USER ID
  const userId = req.id;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // JOB ID
  const jobId = req.params.id;
  // ERROR HANDLING
  if (!jobId) {
    return res
      .status(400)
      .json({ message: "Job ID is Required!", success: false });
  }
  // CHECKING IF THE USER HAS ALREADY APPLIED FOR THE CURRENT JOB
  const existingApplication = await Application.findOne({
    job: jobId,
    applicant: userId,
  });
  // IF USER HAS ALREADY APPLIED FOR THE JOB
  if (existingApplication) {
    return res.status(400).json({
      message: "You have already Applied for this Job!",
      success: false,
    });
  }
  // CHECKING IF THE JOB EXISTS
  const job = await Job.findById(jobId).populate({ path: "company" });
  // IF NO JOB EXISTS
  if (!job) {
    return res.status(400).json({ message: "Job Not Found!", success: false });
  }
  // CREATING A NEW JOB APPLICATION
  const newApplication = await Application.create({
    job: jobId,
    applicant: userId,
  });
  // PROVIDING APPLICATION TO THE JOB & SAVING
  job.applications.push(newApplication._id);
  await job.save();
  // STARTING A SOCKET.IO NOTIFICATION EMIT EVENT
  const notificationData = {
    recipient: job.createdBy,
    message: `A new Applicant ${user.fullName} applied for the Job ${job.title} in ${job.company.name}`,
    link: `/admin/jobs/${job._id}/applicants`,
    isRead: false,
  };
  // CREATING THE NOTIFICATION
  await Notification.create(notificationData);
  // GETTING APPLICANT'S DETAILS
  const applicant = await User.findById(userId);
  // SENDING APPLICATION CONFIRMATION EMAIL ALONG WITH APPLICANT'S DETAILS
  try {
    await sendApplicationConfirmationEmail(
      applicant.email,
      job,
      applicant,
      newApplication.createdAt
    );
  } catch (error) {
    console.error("Error Sending Application Confirmation Email!", error);
  }
  // GETTING RECRUITER'S DETAILS
  const recruiter = await User.findById(job.createdBy).exec();
  // SENDING NEW APPLICATION EMAIL ALONG WITH RECRUITER'S DETAILS
  try {
    await sendNewApplicationEmail(
      recruiter.email,
      recruiter,
      applicant,
      job,
      newApplication.createdAt
    );
  } catch (error) {
    console.error("Error Sending New Application Email", error);
  }
  // RETURNING RESPONSE
  return res.status(201).json({
    message: `You have Successfully Applied for the Job ${job.title}`,
    success: true,
  });
});

// <= GET ALL APPLICATIONS =>
export const getAppliedJobs = expressAsyncHandler(async (req, res) => {
  // GETTING USER ID FROM REQUEST BODY
  const userId = req.id;
  // GETTING USER APPLICATIONS FOR THE JOBS & JOB COMPANIES
  const applications = await Application.find({ applicant: userId })
    .sort({
      createdAt: -1,
    })
    .populate({
      path: "job",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "company",
        options: { sort: { createdAt: -1 } },
      },
    });
  // IF NO APPLICATIONS
  if (!applications) {
    return res
      .status(404)
      .json({ message: "You have not Applied for any Jobs!", success: false });
  }
  // IF APPLICATIONS FOUND
  return res.status(200).json({ applications, success: true });
});

// <= GET JOB APPLICANTS =>
export const jobApplicants = expressAsyncHandler(async (req, res) => {
  // RETRIEVING JOB ID FROM REQUEST PARAMS
  const jobId = req.params.id;
  // FINDING THE JOB WITH APPLICATIONS & APPLICANTS
  const job = await Job.findById(jobId).populate({
    path: "applications",
    options: { sort: { createdAt: -1 } },
    populate: {
      path: "applicant",
    },
  });
  // IF JOB NOT FOUND
  if (!job) {
    return res.status(404).json({
      message: "Job Not Found!",
      success: false,
    });
  }
  // RETURNING RESPONSE
  return res.status(200).json({ job, success: true });
});

// <= UPDATE JOB STATUS =>
export const updateApplicationStatus = expressAsyncHandler(async (req, res) => {
  // GETTING APPLICATION STATUS FROM REQUEST BODY
  const { status } = req.body;
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const recruiter = await User.findById(userId).exec();
  // RETRIEVING THE ID OF THE APPLICATION FOR WHICH THE STATUS IS BEING CHANGED
  const applicationId = req.params.id;
  // IF NO STATUS
  if (!status) {
    return res
      .status(400)
      .json({ message: "Status is Required!", success: false });
  }
  // FINDING THE APPLICATION WITH APPLICATION ID
  const application = await Application.findOne({ _id: applicationId })
    .populate("applicant")
    .populate({ path: "job", populate: { path: "company" } });
  // IF APPLICATION NOT FOUND
  if (!application) {
    return res
      .status(404)
      .json({ message: "Application Not Found", success: false });
  }
  // IF APPLICATION FOUND, UPDATING THE STATUS & SAVING
  application.status = status.toUpperCase();
  const updatedApplication = await application.save();
  // SENDING EMAIL BASE ON APPLICATION STATUS WITH USER'S DETAILS
  try {
    await sendApplicationStatusEmail(
      application.applicant.email,
      application.applicant,
      application.job,
      application,
      updatedApplication.status
    );
  } catch (error) {
    console.error("Error Sending Application Status Email", error);
  }
  // SENDING HIRED EMAIL TO RECRUITER WITH RECRUITER & APPLICANT'S DETAILS
  if (application.status === "ACCEPTED") {
    try {
      await sendNewApplicantHiredEmail(
        recruiter.email,
        application.job,
        application,
        recruiter
      );
    } catch (error) {
      console.error("Error Sending New Applicant Hired Email", error);
    }
  }
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Status Updated Successfully!", success: true });
});

// <= GET BEST MATCHED APPLICANTS =>
export const getBestMatchedApplicants = expressAsyncHandler(
  async (req, res) => {
    // RETRIEVING JOB ID FROM REQUEST PARAMS
    const { id: jobId } = req.params;
    // IF NO JOB ID PROVIDED
    if (!jobId) {
      return res
        .status(400)
        .json({ message: "Job ID is Required!", success: false });
    }
    // FINDING THE JOB IN THE JOB MODEL THROUGH JOB ID
    const job = await Job.findById(jobId).populate({
      path: "applications",
      populate: {
        path: "applicant",
      },
    });
    // IF NO JOB FOUND
    if (!job) {
      return res
        .status(404)
        .json({ message: "Job Not Found!", success: false });
    }

    // PROCESSING JOB REQUIREMENTS FOR MATCHING MECHANISM
    const jobRequirements = job.requirements.map((req) =>
      req.toLowerCase().trim()
    );
    // JOB REQUIREMENTS LENGTH
    const jobRequirementsCount = jobRequirements.length;
    // COMPUTING THE MATCHING SCORE FOR EACH APPLICANT
    const matchedApplicants = job.applications.map((application) => {
      // APPLICANT SKILLS
      const applicantSkills = (application.applicant.profile.skills || []).map(
        (skill) => skill.toLowerCase().trim()
      );
      // COMPARING APPLICANT SKILLS & JOB REQUIREMENTS
      const matchingSkills = jobRequirements.filter((req) =>
        applicantSkills.includes(req)
      );
      // MATCHING SCORE
      const matchingScore = matchingSkills.length;
      return {
        ...application.toObject(),
        matchingScore,
        jobRequirementsCount,
      };
    });
    // SORTING THE MATCHED APPLICANTS BASED ON THEIR SCORE IN DESCENDING ORDER
    matchedApplicants.sort((a, b) => b.matchingScore - a.matchingScore);
    // RETURNING RESPONSE
    return res.status(200).json({ matchedApplicants, success: true });
  }
);
