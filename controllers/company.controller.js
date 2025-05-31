// <= IMPORTS =>
import expressAsyncHandler from "express-async-handler";
import { Company } from "../models/company.model.js";
import getDataURI from "../utils/dataURI.js";
import cloudinary from "../utils/cloudinary.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import {
  sendCompanyDeletionEmail,
  sendCompanyRegistrationEmail,
  sendCompanyUpdateEmail,
  sendNewSubscriberAddedEmail,
  sendSubscriptionConfirmationEmail,
  sendUnsubscriptionConfirmationEmail,
} from "../utils/mailer.js";

// <= REGISTER COMPANY =>
export const registerCompany = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING REQUEST BODY
  const { companyName } = req.body;
  // ERROR HANDLING
  if (!companyName) {
    return res
      .status(400)
      .json({ message: "Company Name is Required!", success: false });
  }
  // DUPLICATE COMPANY CHECK (COMPANY NAME BASIS)
  const duplicateCompany = await Company.findOne({ name: companyName });
  // IF DUPLICATE COMPANY RETURNED
  if (duplicateCompany) {
    return res.status(400).json({
      message: `Company with the Name "${companyName}" is already Registered!`,
      success: false,
    });
  }
  // REGISTERING COMPANY
  const company = await Company.create({
    name: companyName,
    userId: req.id,
  });
  // RETRIEVING THE RECRUITER DETAILS
  const recruiter = await User.findById(req.id).exec();
  // SENDING COMPANY REGISTRATION EMAIL WITH RECRUITER DETAILS
  try {
    await sendCompanyRegistrationEmail(recruiter.email, company, recruiter);
  } catch (error) {
    console.error("Error Sending Company Registration Email", error);
  }
  // RETURNING RESPONSE
  return res.status(201).json({
    message: `Company "${companyName}" Registered Successfully!`,
    success: true,
    company,
  });
});

// <= GET ALL COMPANIES =>
export const getAllCompanies = expressAsyncHandler(async (req, res) => {
  // GETTING FILTER KEYWORD FROM REQUEST QUERY
  const keyword = req.query.keyword || "";
  // MAKING QUERY
  const query = {
    $or: [{ name: { $regex: keyword, $options: "i" } }],
  };
  // FINDING COMPANIES
  const companies = await Company.find(query);
  // IF NO COMPANIES FOUND
  if (!companies) {
    return res
      .status(404)
      .json({ message: "No Companies Found!", success: false });
  }
  // IF COMPANIES FOUND
  return res.status(200).json({ companies, success: true });
});

// <= GET ALL ADMIN COMPANIES =>
export const getAdminCompanies = expressAsyncHandler(async (req, res) => {
  // RETRIEVING USER ID FROM REQUEST BODY
  const userId = req.id;
  // FOUNDING COMPANIES FOR THE USER ID
  const companies = await Company.find({ userId });
  // IF NO COMPANIES FOUND
  if (!companies) {
    return res
      .status(404)
      .json({ message: "No Registered Companies Found!", success: false });
  }
  // IF COMPANIES FOUND
  return res.status(200).json({ companies, success: true });
});

// <= GET COMPANY BY ID =>
export const getCompanyById = expressAsyncHandler(async (req, res) => {
  // RETRIEVING COMPANY ID FROM REQUEST QUERY PARAMS
  const companyId = req.params.id;
  // FOUNDING COMPANY FOR THE REQUEST ID
  const company = await Company.findById(companyId);
  // IF NO COMPANY FOUND
  if (!company) {
    return res
      .status(404)
      .json({ message: "Company Not Found!", success: false });
  }
  // IF COMPANY FOUND
  return res.status(200).json({ company, success: true });
});

// <= UPDATE COMPANY =>
export const updateCompany = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING REQUEST BODY
  const { name, description, website, location } = req.body;
  // LOGO UPLOAD HANDLING
  let logo;
  // IF LOGO WAS PROVIDED
  if (req.file) {
    const file = req.file;
    // CLOUDINARY UPLOAD HANDLING
    const fileURI = getDataURI(file);
    // CHECKING FOR CLOUDINARY RESPONSE
    const cloudResponse = await cloudinary.uploader.upload(fileURI.content);
    // SETTING LOGO
    logo = cloudResponse.secure_url;
  }
  // INITIALIZING UPDATED DATA OBJECT
  const updatedData = {};
  // ADDING DATA CONDITIONALLY TO UPDATED DATA OBJECT
  if (name) updatedData.name = name;
  if (description) updatedData.description = description;
  if (website) updatedData.website = website;
  if (location) updatedData.location = location;
  if (logo) updatedData.logo = logo;
  // FINDING THE COMPANY BEFORE UPDATED
  const oldCompany = await Company.findById(req.params.id).exec();
  // IF OLD COMPANY NOT FOUND
  if (!oldCompany) {
    return res
      .status(404)
      .json({ message: "Company Not Found", success: false });
  }
  // IF COMPANY FOUND UPDATING THE COMPANY
  const company = await Company.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
  });
  // IF NO COMPANY FOUND
  if (!company) {
    return res
      .status(404)
      .json({ message: "Company Not Found After Update!", success: false });
  }
  // CREATING UPDATE MESSAGES BY COMPARING OLD COMPANY & NEW COMPANY
  let changeMessages = [];
  // IF COMPANY NAME WAS CHANGED OR ADDED FOR THE FIRST TIME
  if (name) {
    if (!oldCompany.name || oldCompany.name.trim() === "") {
      changeMessages.push(`Company Name was added as ${name}`);
    } else if (oldCompany.name !== name) {
      changeMessages.push(
        `Your Company Name was changed from "${oldCompany.name}" to "${name}"`
      );
    }
  }
  // IF COMPANY DESCRIPTION WAS CHANGED OR ADDED FOR THE FIRST TIME
  if (description) {
    if (!oldCompany.description || oldCompany.description.trim() === "") {
      changeMessages.push("Company Description was Added");
    } else if (oldCompany.description !== description) {
      changeMessages.push("Company Description was Changed");
    }
  }
  // IF WEBSITE NAME WAS CHANGED OR ADDED FOR THE FIRST TIME
  if (website) {
    if (!oldCompany.website || oldCompany.website.trim() === "") {
      changeMessages.push(`Company Website was added as ${website}`);
    } else if (oldCompany.website !== website) {
      changeMessages.push(
        `Your Company Website was changed from "${oldCompany.website}" to "${website}"`
      );
    }
  }
  // IF COMPANY LOCATION WAS CHANGED OR ADDED FOR THE FIRST TIME
  if (location) {
    if (!oldCompany.location || oldCompany.location.trim() === "") {
      changeMessages.push(`Company Location was added as ${location}`);
    } else if (oldCompany.location !== location) {
      changeMessages.push(
        `Your Company Location was changed from "${oldCompany.location}" to "${location}"`
      );
    }
  }
  // IF COMPANY LOGO WAS CHANGED OR ADDED FOR THE FIRST TIME
  if (logo) {
    if (!oldCompany.logo || oldCompany.logo.trim() === "") {
      changeMessages.push("Company Logo was Added");
    } else if (oldCompany.logo !== logo) {
      changeMessages.push("Company Logo was Changed");
    }
  }
  // JOINING MESSAGES IN TO AN HTML STRING
  const changesHtml = changeMessages.join("<br/>");
  // RETRIEVING RECRUITER DETAILS
  const recruiter = await User.findById(req.id).exec();
  // SENDING THE UPDATE COMPANY EMAIL WITH RECRUITER DETAILS
  try {
    await sendCompanyUpdateEmail(
      recruiter.email,
      company,
      recruiter,
      changesHtml
    );
  } catch (error) {
    console.error("Error Sending Company Update Email", error);
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: `Company "${company.name}" Updated Successfully!`,
    success: true,
  });
});

// <= DELETE COMPANY =>
export const deleteCompany = expressAsyncHandler(async (req, res) => {
  // RETRIEVING COMPANY ID FROM REQUEST PARAMS
  const companyId = req.params.id;
  // CHECKING IF THERE ARE JOBS POSTED FOR THE COMPANY
  const jobs = await Job.find({ company: companyId });
  // IF JOBS FOUND
  if (jobs.length > 0) {
    return res.status(400).json({
      message:
        "Cannot delete Company because there are Jobs Posted for the Company",
      success: false,
    });
  }
  // IF NO JOBS FOUND
  const company = await Company.findById(companyId);
  // IF NO COMPANY FOUND
  if (!company) {
    return res
      .status(404)
      .json({ message: "Company Not Found!", success: false });
  }
  // RETRIEVING RECRUITER DETAILS
  const recruiter = await User.findById(req.id).exec();
  // SENDING THE COMPANY DELETION EMAIL ALONG WITH RECRUITER DETAILS
  try {
    await sendCompanyDeletionEmail(recruiter.email, company, recruiter);
  } catch (error) {
    console.error("Error Sending Company Deletion Email", error);
  }
  // DELETING THE COMPANY
  await company.deleteOne();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: `Company "${company.name}" deleted Successfully!`,
    success: true,
  });
});

// <= SUBSCRIBE TO COMPANY =>
export const subscribeToCompany = expressAsyncHandler(async (req, res) => {
  // RETRIEVING COMPANY ID FROM REQUEST PARAMS
  const companyId = req.params.id;
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING THE COMPANY
  const company = await Company.findById(companyId).exec();
  // IF NO COMPANY FOUND
  if (!company) {
    return res
      .status(404)
      .json({ message: "Company Not Found!", success: false });
  }
  // FIND THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // IF THE USER IS ALREADY SUBSCRIBED
  if (company.subscribers.includes(userId)) {
    return res.status(400).json({
      message: "You've already Subscribed to this Company!",
      success: false,
    });
  }
  if (user.subscriptions.includes(companyId)) {
    return res.status(400).json({
      message: "You've already Subscribed to this Company!",
      success: false,
    });
  }
  // ADDING USER TO THE COMPANY SUBSCRIBERS LIST IF NOT ALREADY
  if (!company.subscribers.includes(userId)) {
    company.subscribers.push(userId);
  }
  // ADDING COMPANY TO THE USER SUBSCRIPTIONS LIST IF NOT ADDED ALREADY
  if (!user.subscriptions.includes(companyId)) {
    user.subscriptions.push(companyId);
  }
  // SAVING THE USER
  await user.save();
  // CREATING UPDATED USER DOCUMENT TO SEND IN RESPONSE
  const updatedUser = {
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
    savedJobs: user.savedJobs,
    subscriptions: user.subscriptions,
    isEmailVerified: user.isEmailVerified,
  };
  // SAVING THE COMPANY
  const updatedCompany = await company.save();
  // SEND A COMPANY SUBSCRIPTION SUCCESSFUL WITH USER'S DETAILS
  try {
    await sendSubscriptionConfirmationEmail(
      updatedUser.email,
      updatedUser,
      updatedCompany
    );
  } catch (error) {
    console.error("Error Sending Company Subscription Email", error);
  }
  // GETTING RECRUITER (COMPANY OWNER) DETAILS
  await updatedCompany.populate("userId", "fullName email");
  // SEND A NEW SUBSCRIBER ADDED EMAIL WITH OWNER AND USER DETAILS
  try {
    await sendNewSubscriberAddedEmail(
      updatedCompany.userId.email,
      updatedCompany.userId.fullName,
      updatedUser.fullName,
      updatedCompany.name
    );
  } catch (error) {
    console.error("Error Sending Subscriber Added Email", error);
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: `You have Successfully Subscribed to ${updatedCompany.name}!`,
    success: true,
    updatedUser,
  });
});

// <= UNSUBSCRIBE TO COMPANY =>
export const unsubscribeFromCompany = expressAsyncHandler(async (req, res) => {
  // RETRIEVING COMPANY ID FROM REQUEST PARAMS
  const companyId = req.params.id;
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING THE COMPANY
  const company = await Company.findById(companyId).exec();
  // IF NO COMPANY FOUND
  if (!company) {
    return res
      .status(404)
      .json({ message: "Company Not Found!", success: false });
  }
  // FIND THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // REMOVING COMPANY FROM USER'S SUBSCRIPTIONS
  user.subscriptions = user.subscriptions.filter(
    (id) => id.toString() !== companyId
  );
  // REMOVING USER FROM COMPANY'S SUBSCRIBERS
  company.subscribers = company.subscribers.filter(
    (id) => id.toString() !== userId
  );
  // SAVING COMPANY
  const updatedCompany = await company.save();
  // SAVING THE USER
  await user.save();
  // CREATING UPDATED USER DOCUMENT TO SEND IN RESPONSE
  const updatedUser = {
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
    savedJobs: user.savedJobs,
    subscriptions: user.subscriptions,
    isEmailVerified: user.isEmailVerified,
  };
  // SEND A COMPANY UNSUBSCRIPTION SUCCESSFUL EMAIL WITH USER'S DETAILS
  try {
    await sendUnsubscriptionConfirmationEmail(
      updatedUser.email,
      updatedUser,
      updatedCompany
    );
  } catch (error) {
    console.error("Error Sending Company Unsubscription Email", error);
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: `You have Successfully Unsubscribed from ${updatedCompany.name}!`,
    success: true,
    updatedUser,
  });
});
