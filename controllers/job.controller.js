// <= IMPORTS =>
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import expressAsyncHandler from "express-async-handler";
import {
  sendNewJobPostedEmailToOwner,
  sendNewJobPostedEmailToSubscribers,
} from "../utils/mailer.js";

// <= POST JOB =>
export const postJob = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING REQUEST BODY
  const {
    title,
    description,
    requirements,
    salary,
    location,
    jobType,
    experienceLevel,
    position,
    companyId,
  } = req.body;
  // GETTING USER ID (LOGGED IN USER)
  const userId = req.id;
  // ERROR HANDLING
  if (
    !title ||
    !description ||
    !requirements ||
    !salary ||
    !location ||
    !jobType ||
    !experienceLevel ||
    !position ||
    !companyId
  ) {
    return res
      .status(400)
      .json({ message: "All Fields are Required", success: false });
  }
  // CREATING JOB
  const job = await Job.create({
    title,
    description,
    requirements: requirements.split(","),
    salary: Number(salary),
    location,
    jobType,
    experienceLevel,
    position,
    company: companyId,
    createdBy: userId,
  });
  // POPULATING JOB DOCUMENT
  const populatedJob = await Job.findById(job._id)
    .populate({
      path: "company",
      populate: { path: "subscribers", select: "fullName email" },
    })
    .exec();
  // FINDING THE COMPANY THROUGH COMPANY ID
  const company = await Company.findById(companyId);
  // OWNER DETAILS
  const owner = await User.findById(company.userId)
    .select("fullName email")
    .exec();
  // SEND A NEW JOB POSTED EMAIL TO SUBSCRIBERS WITH USER'S DETAILS
  try {
    await sendNewJobPostedEmailToSubscribers(
      populatedJob.company,
      populatedJob
    );
  } catch (error) {
    console.error("Error Sending New Job Emails to Subscribers!", error);
  }
  // SEND A NEW JOB POSTED EMAIL TO OWNER WITH USER'S DETAILS
  try {
    await sendNewJobPostedEmailToOwner(
      populatedJob.company,
      populatedJob,
      owner
    );
  } catch (error) {
    console.error("Error Sending New Job Email to Owner!", error);
  }
  // RETURNING RESPONSE
  return res.status(201).json({
    message: `New Job "${job.title} Created Successfully!"`,
    success: true,
    job,
  });
});

// <= GET ALL JOBS =>
export const getAllJobs = expressAsyncHandler(async (req, res) => {
  // GETTING FILTER KEYWORD FROM REQUEST QUERY
  const keyword = req.query.keyword || "";
  // MAKING QUERY
  const query = {
    $or: [
      { title: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ],
  };
  // FINDING JOBS
  const jobs = await Job.find(query)
    .populate({
      path: "company",
    })
    .sort({ createdAt: -1 });
  // IF NO JOBS FOUND
  if (!jobs) {
    return res.status(404).json({ message: "No Jobs Found!", success: false });
  }
  // IF JOBS FOUND
  return res.status(200).json({ jobs, success: true });
});

// <= GET JOB BY ID =>
export const getJobById = expressAsyncHandler(async (req, res) => {
  // RETRIEVING ID FROM REQUEST PARAMS
  const jobId = req.params.id;
  // FINDING JOB WITH COMPANY & APPLICATIONS INFO
  const job = await Job.findById(jobId)
    .populate({
      path: "company",
    })
    .populate({ path: "applications" });
  // IF NO JOB FOUND
  if (!job) {
    return res.status(404).json({ message: "No Job Found", success: false });
  }
  // IF JOB FOUND
  return res.status(200).json({ job, success: true });
});

// <= GET JOBS FOR ADMIN =>
export const getAdminJobs = expressAsyncHandler(async (req, res) => {
  // RETRIEVING ADMIN ID FROM REQUEST BODY
  const adminId = req.id;
  // FINDING JOBS
  const jobs = await Job.find({ createdBy: adminId })
    .populate({
      path: "company",
    })
    .populate({ path: "applications" });
  // IF NO JOBS FOUND
  if (!jobs) {
    return res.status(404).json({ message: "No Jobs Found!", success: false });
  }
  // IF JOBS FOUND
  return res.status(200).json({ jobs, success: true });
});

// <= UPDATE HIRED STATUS =>
export const updateHiredStatus = expressAsyncHandler(async (req, res) => {
  // RETRIEVING JOB ID FROM THE REQUEST PARAMS
  const { id } = req.params;
  // GETTING HIRED STATUS FROM THE REQUEST BODY
  const { hired } = req.body;
  // FINDING THE JOB IN THE JOB MODEL
  const updatedJob = await Job.findByIdAndUpdate(id, { hired }, { new: true })
    .populate({ path: "company" })
    .populate({ path: "applications" })
    .exec();
  // IF NO UPDATED JOB
  if (!updatedJob) {
    return res.status(404).json({ message: "Job Not Found!", success: false });
  }
  // RETURNING THE RESPONSE
  return res
    .status(200)
    .json({ message: "Job Updated Successfully!", success: true, updatedJob });
});

// <= SAVE JOB =>
export const saveJob = expressAsyncHandler(async (req, res) => {
  // RETRIEVING USER ID FROM THE REQUEST ID
  const userId = req.id;
  // RETRIEVING JOB ID FROM REQUEST PARAMS
  const jobId = req.params.id;
  // FINDING THE USER IN THE USER MODEL
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING JOB IN THE JOB MODEL
  const job = await Job.findById(jobId).exec();
  // IF NO JOB FOUND
  if (!job) {
    return res.status(404).json({ message: "Job Not Found!", success: false });
  }
  // CHECKING IF THE JOB IS ALREADY SAVED
  const isJobSaved = user.savedJobs.includes(jobId);
  // IF JOB IS NOT ALREADY SAVED
  if (!isJobSaved) {
    // ADDING JOB TO THE USER'S SAVED JOBS
    user.savedJobs.push(jobId);
    // SAVING THE USER
    await user.save();
  }
  // RETURNING THE RESPONSE
  return res
    .status(200)
    .json({ message: "Job Saved Successfully", success: true, user });
});

// <= UNSAVE JOB =>
export const unsaveJob = expressAsyncHandler(async (req, res) => {
  // RETRIEVING USER ID FROM THE REQUEST ID
  const userId = req.id;
  // RETRIEVING JOB ID FROM REQUEST PARAMS
  const jobId = req.params.id;
  // FINDING THE USER IN THE USER MODEL
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING JOB IN THE JOB MODEL
  const job = await Job.findById(jobId).exec();
  // IF NO JOB FOUND
  if (!job) {
    return res.status(404).json({ message: "Job Not Found!", success: false });
  }
  // REMOVING THE JOB FROM THE SAVED JOBS
  user.savedJobs = user.savedJobs.filter(
    (savedJobId) => savedJobId.toString() !== jobId
  );
  // SAVING THE USER
  await user.save();
  // RETURNING THE RESPONSE
  return res
    .status(200)
    .json({ message: "Job Unsaved Successfully!", success: true, user });
});

// <= DELETE JOB =>
export const deleteJob = expressAsyncHandler(async (req, res) => {
  // RETRIEVING JOB ID FROM REQUEST PARAMS
  const jobId = req.params.id;
  // FINDING JOB IN THE JOB MODEL
  const job = await Job.findById(jobId);
  // IF NO JOB FOUND
  if (!job) {
    return res.status(404).json({ message: "Job Not Found!", success: false });
  }
  // IF JOB FOUND, DELETING THE JOB
  await job.deleteOne();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: `Job "${job.title}" Deleted Successfully!`,
    success: true,
  });
});

// <= UPDATE JOB =>
export const updateJob = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING REQUEST BODY
  const {
    description,
    requirements,
    salary,
    location,
    jobType,
    experienceLevel,
    position,
  } = req.body;
  // UPDATED DATA
  const updatedData = {
    description,
    requirements,
    salary: Number(salary),
    location,
    jobType,
    experienceLevel,
    position,
  };
  // FINDING & UPDATING JOB
  const job = await Job.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
  })
    .populate({ path: "company" })
    .populate({ path: "applications" })
    .exec();
  // IF NO JOB FOUND
  if (!job) {
    return res.status(404).json({ message: "Job Not Found!", success: false });
  }
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: `Job ${job.title} Updated Successfully!`, success: true });
});
