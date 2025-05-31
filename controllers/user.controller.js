// <= IMPORTS =>
import qrcode from "qrcode";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import getDataURI from "../utils/dataURI.js";
import { User } from "../models/user.model.js";
import cloudinary from "../utils/cloudinary.js";
import { Company } from "../models/company.model.js";
import expressAsyncHandler from "express-async-handler";
import { PendingUser } from "../models/pendingUser.model.js";
import {
  send2FADisabledEmail,
  send2FADisableRequestedEmail,
  send2FADisableRequestVerifiedEmail,
  send2FAEnabledEmail,
  send2FARequestedEmail,
  send2FARequestVerifiedEmail,
  sendDeletionVerificationEmail,
  sendDeletionVerifiedEmail,
  sendEmailUpdatedSuccessfulEmail,
  sendEmailUpdateRequestedEmail,
  sendEmailVerificationConfirmationEmail,
  sendForgotPasswordEmail,
  sendNewEmailAddRequestEmail,
  sendPasswordChangeEmail,
  sendPasswordChangeSuccessfulEmail,
  sendPasswordResetSuccessfulEmail,
  sendResumeDeletedEmail,
  sendResumeUpdatedEmail,
  sendUserRegistrationEmail,
  sendUserUpdateEmail,
  sendVerificationEmail,
} from "../utils/mailer.js";

// <= REGISTER USER =>
export const register = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING REQUEST BODY
  const { fullName, email, phoneNumber, password, role } = req.body;
  // ERROR HANDLING
  if (!fullName || !email || !phoneNumber || !password || !role) {
    return res
      .status(400)
      .json({ message: "All Fields are Required!", success: false });
  }
  // DUPLICATE USER CHECK IN PERMANENT & PENDING COLLECTIONS (EMAIL BASIS)
  const duplicateUser = await User.findOne({ email }).exec();
  const duplicatePending = await PendingUser.findOne({ email }).exec();
  // IF DUPLICATE USER RETURNED
  if (duplicateUser || duplicatePending) {
    return res.status(409).json({
      message: `The Email "${email}" has already been Registered!`,
      success: false,
    });
  }
  // PASSWORD VALIDATION CHECKING => (A,a,1,*)
  // PASSWORD REGEX
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[A-Za-z0-9]).{8,}$/;
  // IF PASSWORD DOESN'T MATCH THE REGEX
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: "Please Choose Password within the Given Format!",
      success: false,
    });
  }
  // INITIALIZING AN EMPTY PROFILE DATA OBJECT
  let profileData = {};
  // CONDITIONAL AVATAR UPLOAD HANDLING
  if (req.file) {
    // IF FILE IS PROVIDED
    const file = req.file;
    // CLOUDINARY UPLOAD HANDLING
    const fileURI = getDataURI(file);
    const cloudResponse = await cloudinary.uploader.upload(fileURI.content);
    if (cloudResponse) {
      // ADDING PROFILE PHOTO TO PROFILE DATA
      profileData.profilePhoto = cloudResponse.secure_url;
    }
  }
  // HASHING USER PASSWORD
  const hashedPassword = await bcrypt.hash(password, 10);
  // CONFIRMATION CODE GENERATOR FUNCTION
  const generateConfirmationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  // GENERATING A CONFIRMATION CODE
  const confirmationCode = generateConfirmationCode();
  // REGISTERING USER IN THE PENDING USER COLLECTION
  const pendingUser = await PendingUser.create({
    fullName,
    email,
    phoneNumber,
    password: hashedPassword,
    role: role.toUpperCase(),
    profile: profileData,
    confirmationCode,
  });
  // SENDING USER REGISTRATION CONFIRMATION EMAIL
  try {
    await sendVerificationEmail(
      pendingUser.email,
      confirmationCode,
      pendingUser
    );
  } catch (error) {
    console.error("Error Sending Account Verification Email", error);
  }
  // RETURNING RESPONSE
  res.status(201).json({
    message: `Dear "${fullName}", Please Check your Email for the Confirmation Code!`,
    success: true,
  });
});

// <= VERIFY EMAIL =>
export const verifyEmail = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING THE EMAIL AND THE CODE FROM REQUEST BODY
  const { email, code } = req.body;
  // ERROR HANDLING
  if (!email || !code) {
    return res.status(400).json({
      message: "Email & Confirmation Code are Required!",
      success: false,
    });
  }
  // FINDING THE PENDING USER IN THE PENDING USER MODEL
  const pendingUser = await PendingUser.findOne({
    email,
    confirmationCode: code,
  }).exec();
  // IF NO USER FOUND
  if (!pendingUser) {
    return res.status(404).json({
      message: "Invalid Email or Confirmation Code Provided",
      success: false,
    });
  }
  // IF PENDING USER FOUND, CREATING A PERMANENT USER DOCUMENT
  const user = await User.create({
    fullName: pendingUser.fullName,
    email: pendingUser.email,
    phoneNumber: pendingUser.phoneNumber,
    password: pendingUser.password,
    role: pendingUser.role,
    profile: pendingUser.profile,
    savedJobs: [],
    subscriptions: [],
    isEmailVerified: true,
    isTwoFactorEnabled: false,
  });
  // DELETING THE PENDING USER DOCUMENT
  await pendingUser.deleteOne();
  // SENDING THE VERIFICATION CONFIRMATION EMAIL WITH USER'S DETAILS
  try {
    await sendEmailVerificationConfirmationEmail(email, user);
  } catch (error) {
    console.error("Error Sending Verification Confirmation Email", error);
  }
  // SENDING THE USER REGISTRATION EMAIL WITH USER'S DETAILS
  try {
    await sendUserRegistrationEmail(email, user);
  } catch (error) {
    console.error("Error Sending User Registration Email", error);
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Email verified Successfully! You can Login Now",
    success: true,
  });
});

// <= REQUEST ENABLE 2FA =>
export const requestEnableTwoFactorAuthentication = expressAsyncHandler(
  async (req, res) => {
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL THOUGH USER ID
    const user = await User.findById(userId).exec();
    // IN USER NOT FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found!", success: false });
    }
    // CONFIRMATION CODE GENERATOR FUNCTION
    const generateConfirmationCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    // CONFIRMATION CODE EXPIRY TIME GENERATOR
    const expiry = Date.now() + 15 * 60 * 1000;
    // GENERATING A CONFIRMATION CODE
    const confirmationCode = generateConfirmationCode();
    // SETTING THE USER CONFIRMATION CODE FOR VERIFICATION
    user.confirmationCode = confirmationCode;
    // SETTING THE USER CONFIRMATION CODE EXPIRY
    user.confirmationCodeExpiresIn = expiry;
    // SAVING THE USER
    await user.save();
    // SENDING THE 2FA ENABLE REQUESTED EMAIL WITH USER'S DETAILS
    try {
      await send2FARequestedEmail(user.email, user, confirmationCode);
      return res.status(200).json({
        message:
          "Enable 2FA Requested Email Sent Successfully! Please Check your Inbox",
        success: true,
      });
    } catch (error) {
      console.error("Error Sending 2FA Requested Email!", error);
      return res.status(500).json({
        message: "Error Sending 2FA Requested Email!",
        success: false,
      });
    }
  }
);

// <= VERIFY & INITIATE 2FA ACTIVATION =>
export const enableTwoFactorAuthentication = expressAsyncHandler(
  async (req, res) => {
    // GETTING THE CODE SENT IN THE REQUEST BODY
    const { code } = req.body;
    // IF NO CODE PROVIDED
    if (!code) {
      return res
        .status(400)
        .json({ message: "Verification Code is Required!", success: false });
    }
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL THROUGH USER ID
    const user = await User.findById(userId).exec();
    // IF NO USER FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found", success: false });
    }
    // MATCHING THE CODE SENT WITH THE ONE SAVED IN CONFIRMATION CODE
    if (user.confirmationCode !== code) {
      return res.status(400).json({
        message: "Invalid Confirmation Code Provided!",
        success: false,
      });
    }
    // CHECKING IF THE CONFIRMATION CODE HAS EXPIRED OR NOT
    if (
      !user.confirmationCodeExpiresIn ||
      user.confirmationCodeExpiresIn < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: "Confirmation Code has Expired!", success: false });
    }
    // GENERATING A TOTP SECRET
    const secret = speakeasy.generateSecret({
      name: `JobHunt - (${user.email})`,
    });
    // SAVING THE TOTP SECRET TEMPORARILY IN USER SECRET FIELD
    user.totpSecret = secret.base32;
    // CLEARING TEMPORARY FIELDS
    user.confirmationCode = null;
    user.confirmationCodeExpiresIn = null;
    // SAVING THE USER
    const updatedUser = await user.save();
    // GENERATING QR CODE
    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);
    // SENDING THE 2FA REQUEST SUCCESSFUL EMAIL WITH USER'S DETAILS
    try {
      await send2FARequestVerifiedEmail(updatedUser.email, updatedUser);
    } catch (error) {
      console.error("Error Sending 2FA Request Successful Email", error);
    }
    // RETURNING RESPONSE
    return res.status(200).json({
      message:
        "Email Verification Successful! Please Scan the QR Code with Authenticator",
      success: true,
      qrCodeDataURL,
      user: updatedUser,
    });
  }
);

// <= VERIFY 2FA & ACTIVATE =>
export const verifyTwoFactorAuthentication = expressAsyncHandler(
  async (req, res) => {
    // GETTING TOKEN FROM REQUEST BODY
    const { token } = req.body;
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL THROUGH USER ID
    const user = await User.findById(userId).exec();
    // IF NO USER FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found", success: false });
    }
    // IF TOTP SECRET IS NOT PRESENT
    if (!user.totpSecret) {
      return res
        .status(400)
        .json({ message: "2FA is not Initialized!", success: false });
    }
    // VERIFYING THE TOTP SECRET
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token,
    });
    // IF TOTP VERIFIED OR NOT VERIFIED
    if (verified) {
      user.isTwoFactorEnabled = true;
      const updatedUser = await user.save();
      try {
        await send2FAEnabledEmail(updatedUser.email, updatedUser);
      } catch (error) {
        console.error("Error Sending 2FA Enabled Email", error);
      }
      return res.status(200).json({
        message: "2FA Enabled Successfully!",
        success: true,
        user: updatedUser,
      });
    } else {
      return res.status(400).json({ message: "Invalid Token", success: false });
    }
  }
);

// <= REQUEST DISABLE 2FA =>
export const requestDisableTwoFactorAuthentication = expressAsyncHandler(
  async (req, res) => {
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL THOUGH USER ID
    const user = await User.findById(userId).exec();
    // IN USER NOT FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found!", success: false });
    }
    // CONFIRMATION CODE GENERATOR FUNCTION
    const generateConfirmationCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    // CONFIRMATION CODE EXPIRY TIME GENERATOR
    const expiry = Date.now() + 15 * 60 * 1000;
    // GENERATING A CONFIRMATION CODE
    const confirmationCode = generateConfirmationCode();
    // SETTING THE USER CONFIRMATION CODE FOR VERIFICATION
    user.confirmationCode = confirmationCode;
    // SETTING THE USER CONFIRMATION CODE EXPIRY
    user.confirmationCodeExpiresIn = expiry;
    // SAVING THE USER
    await user.save();
    // SENDING THE 2FA DISABLE REQUESTED EMAIL WITH USER'S DETAILS
    try {
      await send2FADisableRequestedEmail(user.email, user, confirmationCode);
      return res.status(200).json({
        message:
          "Disable 2FA Requested Email Sent Successfully! Please Check your Inbox",
        success: true,
      });
    } catch (error) {
      console.error("Error Sending 2FA Disable Requested Email!", error);
      return res.status(500).json({
        message: "Error Sending 2FA Disable Requested Email!",
        success: false,
      });
    }
  }
);

// <= VERIFY 2FA DE-ACTIVATION =>
export const verifyDisableTwoFactorAuthentication = expressAsyncHandler(
  async (req, res) => {
    // GETTING THE CODE SENT IN THE REQUEST BODY
    const { code } = req.body;
    // IF NO CODE PROVIDED
    if (!code) {
      return res
        .status(400)
        .json({ message: "Verification Code is Required!", success: false });
    }
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL THROUGH USER ID
    const user = await User.findById(userId).exec();
    // IF NO USER FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found", success: false });
    }
    // MATCHING THE CODE SENT WITH THE ONE SAVED IN CONFIRMATION CODE
    if (user.confirmationCode !== code) {
      return res.status(400).json({
        message: "Invalid Confirmation Code Provided!",
        success: false,
      });
    }
    // CHECKING IF THE CONFIRMATION CODE HAS EXPIRED OR NOT
    if (
      !user.confirmationCodeExpiresIn ||
      user.confirmationCodeExpiresIn < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: "Confirmation Code has Expired!", success: false });
    }
    // CLEARING TEMPORARY FIELDS
    user.confirmationCode = null;
    user.confirmationCodeExpiresIn = null;
    // SAVING THE USER
    const updatedUser = await user.save();
    // SENDING THE 2FA DISABLE REQUEST SUCCESSFUL EMAIL WITH USER'S DETAILS
    try {
      await send2FADisableRequestVerifiedEmail(updatedUser.email, updatedUser);
    } catch (error) {
      console.error(
        "Error Sending 2FA Disable Request Successful Email",
        error
      );
    }
    // RETURNING RESPONSE
    return res.status(200).json({
      message:
        "Email Verification Successful! Please Enter the OTP from your Authenticator App",
      success: true,
      user: updatedUser,
    });
  }
);

// <= DISABLE 2FA =>
export const disableTwoFactorAuthentication = expressAsyncHandler(
  async (req, res) => {
    // GETTING TOKEN FROM REQUEST BODY
    const { token } = req.body;
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL THROUGH USER ID
    const user = await User.findById(userId).exec();
    // IF NO USER FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found", success: false });
    }
    // IF TOTP SECRET IS NOT PRESENT
    if (!user.totpSecret) {
      return res
        .status(400)
        .json({ message: "2FA is not Initialized!", success: false });
    }
    // VERIFYING THE TOTP SECRET
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token,
    });
    // IF TOTP VERIFIED OR NOT VERIFIED
    if (verified) {
      // CLEARING 2FA RELATED FIELDS FOR USER
      user.isTwoFactorEnabled = false;
      user.totpSecret = null;
      const updatedUser = await user.save();
      try {
        await send2FADisabledEmail(updatedUser.email, updatedUser);
      } catch (error) {
        console.error("Error Sending 2FA Disabled Email", error);
      }
      return res.status(200).json({
        message: "2FA Disabled Successfully!",
        success: true,
        user: updatedUser,
      });
    } else {
      return res.status(400).json({ message: "Invalid Token", success: false });
    }
  }
);

// <= LOGIN =>
export const login = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING REQUEST BODY
  const { email, password, role } = req.body;
  // ERROR HANDLING
  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ message: "All Fields are Required!", success: false });
  }
  // FINDING USER
  const foundUser = await User.findOne({ email }).exec();
  // IF NO USER FOUND
  if (!foundUser) {
    return res.status(400).json({ message: "User Not Found!", success: false });
  }
  // MATCHING PASSWORD
  const matchPassword = await bcrypt.compare(password, foundUser.password);
  // IF NO PASSWORD MATCH
  if (!matchPassword) {
    return res
      .status(400)
      .json({ message: "Incorrect Password!", success: false });
  }
  // CHECKING USER ROLE
  if (role.toUpperCase() !== foundUser.role) {
    return res.status(400).json({
      message: `Account doesn't exist with ${role} Role!`,
      success: false,
    });
  }
  // CHECKING IF THE 2FA IS ENABLED FOR THE USER OR NOT
  if (foundUser.isTwoFactorEnabled === true) {
    // SIGNING A TEMPORARY TOKEN IF 2FA IS ENABLED
    const tempTokenData = {
      userId: foundUser._id,
      is2FA: true,
    };
    const tempToken = jwt.sign(tempTokenData, process.env.TOKEN_SECRET_KEY, {
      expiresIn: "3m",
    });
    // RETURNING RESPONSE
    return res.status(200).json({
      message: "Two Factor Authentication Required!",
      success: true,
      twoFactorRequired: true,
      tempToken,
    });
  }
  // SETTING TOKEN DATA
  const tokenData = {
    userId: foundUser._id,
  };
  // SIGNING TOKEN
  const token = jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, {
    expiresIn: "1d",
  });
  // RETURNING LOGGED IN USER
  const user = {
    _id: foundUser._id,
    fullName: foundUser.fullName,
    email: foundUser.email,
    phoneNumber: foundUser.phoneNumber,
    role: foundUser.role,
    profile: foundUser.profile,
    savedJobs: foundUser.savedJobs,
    subscriptions: foundUser.subscriptions,
    isEmailVerified: foundUser.isEmailVerified,
    isTwoFactorEnabled: foundUser.isTwoFactorEnabled,
  };
  // RETURNING RESPONSE & SETTING COOKIE
  return res
    .status(200)
    .cookie("token", token, {
      maxAge: 1 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
      secure: process.env.NODE_ENV === "development" ? false : true,
    })
    .json({
      message: `Welcome Back ${foundUser.fullName}`,
      success: true,
      user,
    });
});

// <= VERIFYING 2FA LOGIN =>
export const verify2FALogin = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING TEMPORARY TOKEN & AUTHENTICATOR OTP FROM REQUEST BODY
  const { tempToken, otp } = req.body;
  // IF NOT TEMPORARY TOKEN OR OTP FOUND
  if (!tempToken || !otp) {
    return res
      .status(404)
      .json({ message: "Temporary Token & OTP are Required!", success: false });
  }
  // VERIFYING THE TEMPORARY TOKEN BY DECODING IT
  try {
    const payload = jwt.verify(tempToken, process.env.TOKEN_SECRET_KEY);
    // IF NOT 2FA FLAG FOUND
    if (!payload.is2FA) {
      throw new Error("Not a 2FA Token");
    }
    // FINDING THE USER BY USER ID FROM DECODED TOKEN
    const foundUser = await User.findById(payload.userId).exec();
    // IF NO USER FOUND
    if (!foundUser) {
      return res
        .status(404)
        .json({ message: "User Not Found!", success: false });
    }
    // VERIFYING THE TOTP BY USING THE USER'S STORED TOTP SECRET
    if (!foundUser.totpSecret) {
      return res.status(400).json({
        message: "Two Factor Authentication is not Enabled!",
        success: false,
      });
    }
    // VERIFYING THE TOTP
    const verified = speakeasy.totp.verify({
      secret: foundUser.totpSecret,
      encoding: "base32",
      token: otp,
    });
    // IT OTP NOT VERIFIED
    if (!verified) {
      return res
        .status(400)
        .json({ message: "Invalid OTP Found!", success: false });
    }
    // SETTING TOKEN DATA
    const tokenData = {
      userId: foundUser._id,
    };
    // SIGNING TOKEN
    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, {
      expiresIn: "1d",
    });
    // RETURNING LOGGED IN USER
    const user = {
      _id: foundUser._id,
      fullName: foundUser.fullName,
      email: foundUser.email,
      phoneNumber: foundUser.phoneNumber,
      role: foundUser.role,
      profile: foundUser.profile,
      savedJobs: foundUser.savedJobs,
      subscriptions: foundUser.subscriptions,
      isEmailVerified: foundUser.isEmailVerified,
      isTwoFactorEnabled: foundUser.isTwoFactorEnabled,
    };
    // RETURNING RESPONSE & SETTING COOKIE
    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
        secure: process.env.NODE_ENV === "development" ? false : true,
      })
      .json({
        message: `Welcome Back ${foundUser.fullName}`,
        success: true,
        user,
      });
  } catch (error) {
    console.error("2FA Login Error", error);
    return res
      .status(400)
      .json({ message: "Invalid or Expired Token/OTP Found!", success: false });
  }
});

// <= LOGOUT =>
export const logout = expressAsyncHandler(async (_req, res) => {
  // CLEARING COOKIE ON LOGOUT
  return res
    .status(200)
    .cookie("token", "", { maxAge: 0 })
    .json({ message: "User Logged Out Successfully!", success: true });
});

// <= UPDATE USER =>
export const updateProfile = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING REQUEST BODY
  const { fullName, phoneNumber, bio, skills } = req.body;
  // CONVERTING SKILLS FROM STRING TO ARRAY IF PROVIDED
  let skillsArray;
  if (skills) skillsArray = skills.split(",");
  // DESTRUCTURING USER ID FOR AUTHENTICATION
  const userId = req.id;
  // FOUNDING USER
  const foundUser = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!foundUser) {
    return res.status(400).json({ message: "User Not Found!", success: false });
  }
  // INITIALIZING CHANGES ARRAY
  let changeMessages = [];
  // UPDATING USER PROPERTIES & PREPARING MESSAGES ON THE BASIS OF DATA SENT
  // IF FULLNAME WAS UPDATED
  if (fullName && fullName.trim() !== foundUser.fullName.trim()) {
    changeMessages.push(
      `Your Profile Name was Changed from ${foundUser.fullName} to ${fullName}`
    );
    foundUser.fullName = fullName;
  }
  // IF PHONE NUMBER WAS UPDATED
  if (
    phoneNumber &&
    String(phoneNumber).trim() !== String(foundUser.phoneNumber).trim()
  ) {
    changeMessages.push(
      `Your Profile Phone Number was Changed from ${foundUser.phoneNumber} to ${phoneNumber}`
    );
    foundUser.phoneNumber = phoneNumber;
  }
  // IF BIO WAS UPDATED
  if (
    bio &&
    bio.trim() !== (foundUser.profile.bio ? foundUser.profile.bio.trim() : "")
  ) {
    changeMessages.push("Your Profile Bio was Updated");
    foundUser.profile.bio = bio;
  }
  // IF SKILLS WERE UPDATED
  if (skills) {
    // EXISTING SKILLS
    const existingSkills = foundUser.profile.skills || [];
    if (JSON.stringify(skillsArray) !== JSON.stringify(existingSkills)) {
      changeMessages.push("Your Skills Were Updated");
      foundUser.profile.skills = skillsArray;
    }
  }
  // JOINING MESSAGES IN TO AN HTML STRING
  const changesHtml = changeMessages.join("<br/>");
  // SAVING THE USER
  await foundUser.save();
  // CREATING UPDATED USER OBJECT TO SEND IN RESPONSE
  const updatedUser = {
    _id: foundUser._id,
    fullName: foundUser.fullName,
    email: foundUser.email,
    phoneNumber: foundUser.phoneNumber,
    role: foundUser.role,
    profile: foundUser.profile,
    savedJobs: foundUser.savedJobs,
    subscriptions: foundUser.subscriptions,
    isEmailVerified: foundUser.isEmailVerified,
  };
  // SENDING A UPDATE USER EMAIL WITH USER'S DETAILS
  try {
    await sendUserUpdateEmail(
      updatedUser.email,
      updatedUser,
      foundUser.updatedAt,
      changesHtml
    );
  } catch (error) {
    console.error("Error Sending Profile Update Update Email", error);
  }

  // RETURNING RESPONSE & UPDATED USER
  return res.status(200).json({
    message: "Profile Updated Successfully!",
    success: true,
    updatedUser,
  });
});

// <= UPLOAD AVATAR =>
export const uploadAvatar = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // IF RESUME NOT PROVIDED
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "Resume must be Provided!", success: false });
  }
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // RESUME UPLOAD HANDLING
  const file = req.file;
  const fileURI = getDataURI(file);
  // CLOUDINARY UPLOAD
  const cloudResponse = await cloudinary.uploader.upload(fileURI.content);
  // IF CLOUDINARY UPLOAD FAILS
  if (!cloudResponse) {
    return res
      .status(500)
      .json({ message: "Failed to Upload Avatar!", success: false });
  }
  // SAVING THE AVATAR
  user.profile.profilePhoto = cloudResponse.secure_url;
  // SAVING THE USER
  await user.save();
  // CREATING UPDATED USER DOCUMENT TO SEND IN RESPONSE
  const updatedUser = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
    savedJobs: user.savedJobs,
    subscriptions: user.subscriptions,
    isEmailVerified: user.isEmailVerified,
  };
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Avatar Uploaded Successfully!",
    success: true,
    updatedUser,
  });
});

// <= DELETE AVATAR =>
export const deleteAvatar = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // DELETING THE AVATAR
  user.profile.profilePhoto = null;
  // SAVING THE USER
  await user.save();
  // CREATING UPDATED USER DOCUMENT TO SEND IN RESPONSE
  const updatedUser = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
    savedJobs: user.savedJobs,
    subscriptions: user.subscriptions,
    isEmailVerified: user.isEmailVerified,
  };
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Avatar Deleted Successfully!",
    success: true,
    updatedUser,
  });
});

// <= UPDATE RESUME =>
export const updateResume = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // IF RESUME NOT PROVIDED
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "Resume must be Provided!", success: false });
  }
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // RESUME UPLOAD HANDLING
  const file = req.file;
  const fileURI = getDataURI(file);
  // CLOUDINARY UPLOAD
  const cloudResponse = await cloudinary.uploader.upload(fileURI.content);
  // IF CLOUDINARY UPLOAD FAILS
  if (!cloudResponse) {
    return res
      .status(500)
      .json({ message: "Failed to Upload Resume!", success: false });
  }
  // SAVING THE RESUME & RESUME ORIGINAL NAME
  user.profile.resume = cloudResponse.secure_url;
  user.profile.resumeOriginalName = file.originalname;
  // SAVING THE USER
  await user.save();
  // SENDING A RESUME UPDATED RESUME WITH USER'S DETAILS
  try {
    await sendResumeUpdatedEmail(user.email, user);
  } catch (error) {
    console.error("Error Sending Resume Updated Resume", error);
  }
  // CREATING UPDATED USER DOCUMENT TO SEND IN RESPONSE
  const updatedUser = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
    savedJobs: user.savedJobs,
    subscriptions: user.subscriptions,
    isEmailVerified: user.isEmailVerified,
  };
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Resume Uploaded Successfully!",
    success: true,
    updatedUser,
  });
});

// <= DELETE RESUME =>
export const deleteResume = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // DELETING THE RESUME & RESUME ORIGINAL NAME
  user.profile.resume = null;
  user.profile.resumeOriginalName = null;
  // SAVING THE USER
  await user.save();
  // SENDING A RESUME DELETED RESUME WITH USER'S DETAILS
  try {
    await sendResumeDeletedEmail(user.email, user);
  } catch (error) {
    console.error("Error Sending Resume Deleted Resume", error);
  }
  // CREATING UPDATED USER DOCUMENT TO SEND IN RESPONSE
  const updatedUser = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
    savedJobs: user.savedJobs,
    subscriptions: user.subscriptions,
    isEmailVerified: user.isEmailVerified,
  };
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Resume Deleted Successfully!",
    success: true,
    updatedUser,
  });
});

// <= GET SAVED JOBS =>
export const getSavedJobs = expressAsyncHandler(async (req, res) => {
  // RETRIEVING USER ID FOR AUTHENTICATION
  const userId = req.id;
  // FINDING THE USER IN THE USER MODEL
  const foundUser = await User.findById(userId).populate({
    path: "savedJobs",
    populate: {
      path: "company",
      model: "Company",
    },
  });
  // IF NO USER FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // IF NO JOBS FOUND
  if (foundUser.savedJobs.length === 0) {
    return res
      .status(404)
      .json({ message: "No Saved Jobs Found!", success: false });
  }
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ savedJobs: foundUser.savedJobs, success: true });
});

// <= DELETE VERIFICATION EMAIL =>
export const sendDeleteVerificationEmailToUser = expressAsyncHandler(
  async (req, res) => {
    // GETTING CURRENT LOGGED IN USER'S ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL
    const user = await User.findById(userId).exec();
    // IF NO USER FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found!", success: false });
    }
    // CONFIRMATION CODE GENERATOR FUNCTION
    const generateConfirmationCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    // GENERATING A CONFIRMATION CODE
    const confirmationCode = generateConfirmationCode();
    // SETTING THE USER CONFIRMATION CODE FOR VERIFICATION
    user.confirmationCode = confirmationCode;
    // SAVING THE USER
    await user.save();
    // SENDING DELETION VERIFICATION EMAIL WITH USER'S DETAILS
    try {
      await sendDeletionVerificationEmail(user.email, user, confirmationCode);
      return res.status(200).json({
        message: "Deletion Verification Email Sent Successfully!",
        success: true,
      });
    } catch (error) {
      console.error("Error Sending Deletion Verification Email", error);
      return res.status(500).json({
        message: "Deletion Verification Email cannot be Sent!",
        success: false,
      });
    }
  }
);

// <= VERIFY DELETION CODE =>
export const verifyDeletionCode = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING THE EMAIL & THE CODE FROM REQUEST BODY
  const { email, code } = req.body;
  // IF NO EMAIL OR CODE
  if (!email || !code) {
    return res.status(400).json({
      message: "Email & Confirmation Code are Required!",
      success: false,
    });
  }
  // FINDING THE USER IN THE USR MODEL THROUGH PROVIDED EMAIL
  const user = await User.findOne({ email }).exec();
  // IF NO USER
  if (!user) {
    return res.status(404).json({ message: "user Not Found!", success: false });
  }
  // IF CONFIRMATION DOES NOT MATCH WITH CODE SENT WITH REQUEST BODY
  if (user.confirmationCode !== code) {
    return res
      .status(400)
      .json({ message: "Invalid Confirmation Code Provided!", success: false });
  }
  // IF MATCHES, CLEARING THE CONFIRMATION CODE
  user.confirmationCode = null;
  // SAVING THE USER
  await user.save();
  return res
    .status(200)
    .json({ message: "Deletion Code Verified Successfully!", success: true });
});

// <= DELETE USER =>
export const deleteUser = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER'S ID
  const userId = req.id;
  // FINDING USER IN THE USER MODEL
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // IF USER IS RECRUITER, CHECKING FOR THE REGISTERED COMPANIES
  if (user.role.toUpperCase() === "RECRUITER") {
    // CHECKING FOR REGISTERED COMPANIES
    const companies = await Company.find({ userId: userId });
    // IF THERE ARE COMPANIES
    if (companies.length > 0) {
      return res.status(400).json({
        message:
          "You cannot Delete your Account because you have Registered Companies!",
        success: false,
      });
    }
  }
  // CHECKING IF THE CONFIRMATION CODE IS CLEARED
  if (user.confirmationCode) {
    return res.status(400).json({
      message:
        "Please Complete Deletion Verification before Deleting your Account",
      success: false,
    });
  }
  // IF NO COMPANIES, DELETING THE USER
  await user.deleteOne();
  // CLEARING AUTHENTICATION COOKIES
  res.clearCookie("token");
  // SENDING THE DELETION VERIFIED EMAIL WITH USER'S DETAILS
  try {
    await sendDeletionVerifiedEmail(user.email, user);
  } catch (error) {
    console.error("Error Sending Deletion Verified Email", error);
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: `User ${user.fullName} deleted Successfully!`,
    success: true,
  });
});

// <= INITIATE CHANGE PASSWORD =>
export const initiateChangePassword = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER'S ID
  const userId = req.id;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // CONFIRMATION CODE GENERATOR FUNCTION
  const generateConfirmationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  // CONFIRMATION CODE EXPIRY TIME GENERATOR
  const expiry = Date.now() + 15 * 60 * 1000;
  // GENERATING A CONFIRMATION CODE
  const confirmationCode = generateConfirmationCode();
  // SETTING THE USER CONFIRMATION CODE FOR VERIFICATION
  user.confirmationCode = confirmationCode;
  // SETTING THE USER CONFIRMATION CODE EXPIRY
  user.confirmationCodeExpiresIn = expiry;
  // SAVING THE USER
  await user.save();
  // SENDING THE FORGOT PASSWORD EMAIL ALONG WITH USER'S DETAILS
  try {
    await sendPasswordChangeEmail(user.email, user, confirmationCode);
    return res.status(200).json({
      message: "Change Password Email Sent Successfully!",
      success: true,
    });
  } catch (error) {
    console.error("Error Sending Change Password Email", error);
    return res
      .status(500)
      .json({ message: "Error Sending Change Password Email", success: false });
  }
});

// <= CHANGE PASSWORD =>
export const changePassword = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING THE NEW PASSWORD FROM THE REQUEST BODY
  const { code, newPassword } = req.body;
  // GETTING CURRENT LOGGED IN USERS'S ID
  const userId = req.id;
  // ERROR HANDLING
  if (!newPassword || !code) {
    return res.status(400).json({
      message: "New Password & Confirmation Code are Required",
      success: false,
    });
  }
  // PASSWORD VALIDATION CHECKING => (A,a,1,*)
  // PASSWORD REGEX
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[A-Za-z0-9]).{8,}$/;
  // IF PASSWORD DOESN'T MATCH THE REGEX
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message: "Please Choose Password within the Given Format!",
      success: false,
    });
  }
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found", success: false });
  }
  // MATCHING THE CODE SENT WITH THE ONE SAVED IN CONFIRMATION CODE
  if (user.confirmationCode !== code) {
    return res
      .status(400)
      .json({ message: "Invalid Confirmation Code Provided!", success: false });
  }
  // CHECKING IF THE CONFIRMATION CODE HAS EXPIRED OR NOT
  if (
    !user.confirmationCodeExpiresIn ||
    user.confirmationCodeExpiresIn < Date.now()
  ) {
    return res
      .status(400)
      .json({ message: "Confirmation Code has Expired!", success: false });
  }
  // HASHING THE NEW PASSWORD
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  // SAVING THE NEW PASSWORD
  user.password = hashedPassword;
  // CLEARING THE CONFIRMATION CODE AND CONFIRMATION CODE EXPIRY
  user.confirmationCode = null;
  user.confirmationCodeExpiresIn = null;
  // SAVING THE USER
  await user.save();
  // SENDING PASSWORD RESET SUCCESSFUL EMAIL WITH USER'S DETAILS
  try {
    await sendPasswordChangeSuccessfulEmail(user.email, user);
  } catch (error) {
    console.error("Error Sending Password Change Successful Email", error);
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Password Changed Successfully!",
    success: true,
  });
});

// <= FORGOT PASSWORD =>
export const forgotPassword = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING EMAIL FROM REQUEST BODY
  const { email } = req.body;
  // IF NO EMAIL
  if (!email) {
    return res
      .status(400)
      .json({ message: "Email is Required!", success: false });
  }
  // FINDING THE USER IN THE USER MODEL THROUGH PROVIDED EMAIL
  const user = await User.findOne({ email }).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // CHECKING IF USER EMAIL IS VERIFIED
  if (!user.isEmailVerified) {
    return res.status(400).json({
      message:
        "Email not Verified! Please Verify your Email or Update your Email First",
      success: false,
    });
  }
  // CONFIRMATION CODE GENERATOR FUNCTION
  const generateConfirmationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  // CONFIRMATION CODE EXPIRY TIME GENERATOR
  const expiry = Date.now() + 15 * 60 * 1000;
  // GENERATING A CONFIRMATION CODE
  const confirmationCode = generateConfirmationCode();
  // SETTING THE USER CONFIRMATION CODE FOR VERIFICATION
  user.confirmationCode = confirmationCode;
  // SETTING THE USER CONFIRMATION CODE EXPIRY
  user.confirmationCodeExpiresIn = expiry;
  // SAVING THE USER
  await user.save();
  // SENDING THE FORGOT PASSWORD EMAIL ALONG WITH USER'S DETAILS
  try {
    await sendForgotPasswordEmail(email, user, confirmationCode);
    return res.status(200).json({
      message: "Forgot Password Email Sent Successfully!",
      success: true,
    });
  } catch (error) {
    console.error("Error Sending Forgot Password Email", error);
    return res
      .status(500)
      .json({ message: "Error Sending Forgot Password Email", success: false });
  }
});

// <= RESET PASSWORD =>
export const resetPassword = expressAsyncHandler(async (req, res) => {
  // DESTRUCTURING EMAIL, CODE AND NEW PASSWORD FROM REQUEST BODY
  const { email, code, newPassword } = req.body;
  // IF NO EMAIL OR CODE OR NEW PASSWORD FOUND
  if (!email || !code || !newPassword) {
    return res.status(400).json({
      message: "Email, Code & New Password are Required!",
      success: false,
    });
  }
  // FINDING THE USER IN THE USER MODEL THROUGH PROVIDED EMAIL
  const user = await User.findOne({ email }).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // MATCHING THE CODE SENT WITH THE ONE SAVED IN CONFIRMATION CODE
  if (user.confirmationCode !== code) {
    return res
      .status(400)
      .json({ message: "Invalid Confirmation Code Provided!", success: false });
  }
  // CHECKING IF THE CONFIRMATION CODE HAS EXPIRED OR NOT
  if (
    !user.confirmationCodeExpiresIn ||
    user.confirmationCodeExpiresIn < Date.now()
  ) {
    return res
      .status(400)
      .json({ message: "Confirmation Code has Expired!", success: false });
  }
  // PASSWORD VALIDATION CHECKING => (A,a,1,*)
  // PASSWORD REGEX
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[A-Za-z0-9]).{8,}$/;
  // IF PASSWORD DOESN'T MATCH THE REGEX
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message: "Please Choose Password within the Given Format!",
      success: false,
    });
  }
  // HASHING THE PASSWORD
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  // SAVING THE NEW PASSWORD
  user.password = hashedPassword;
  // CLEARING THE CONFIRMATION CODE AND CONFIRMATION CODE EXPIRY
  user.confirmationCode = null;
  user.confirmationCodeExpiresIn = null;
  // SAVING THE USER
  await user.save();
  // SENDING PASSWORD RESET SUCCESSFUL EMAIL WITH USER'S DETAILS
  try {
    await sendPasswordResetSuccessfulEmail(email, user);
  } catch (error) {
    console.error("Error Sending Password Reset Successful Email", error);
  }
  return res
    .status(200)
    .json({ message: "Password Reset Successful!", success: true });
});

// <= REQUEST EMAIL UPDATE VERIFICATION =>
export const requestEmailUpdateVerification = expressAsyncHandler(
  async (req, res) => {
    // GETTING CURRENT LOGGED IN USER ID
    const userId = req.id;
    // FINDING THE USER IN THE USER MODEL THROUGH USER ID
    const user = await User.findById(userId).exec();
    // IF NO USER FOUND
    if (!user) {
      return res
        .status(404)
        .json({ message: "User Not Found!", success: false });
    }
    // CONFIRMATION CODE GENERATOR FUNCTION
    const generateConfirmationCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    // CONFIRMATION CODE EXPIRY TIME GENERATOR
    const expiry = Date.now() + 15 * 60 * 1000;
    // GENERATING A CONFIRMATION CODE
    const confirmationCode = generateConfirmationCode();
    // SETTING THE USER CONFIRMATION CODE FOR VERIFICATION
    user.confirmationCode = confirmationCode;
    // SETTING THE USER CONFIRMATION CODE EXPIRY
    user.confirmationCodeExpiresIn = expiry;
    // SAVING THE USER
    await user.save();
    // SENDING EMAIL UPDATE REQUESTED EMAIL WITH USER'S DETAILS
    try {
      await sendEmailUpdateRequestedEmail(user.email, user, confirmationCode);
    } catch (error) {
      console.error("Error Sending Email Updated Requested Email!", error);
      return res.status(500).json({
        message: "Error Sending Email Updated Requested Email!",
        success: false,
      });
    }
    // RETURNING RESPONSE
    return res.status(200).json({
      message: "Email Verification Code Sent to your Current Email!",
      success: true,
    });
  }
);

// <= INITIATE NEW EMAIL UPDATE =>
export const initiateNewEmailUpdate = expressAsyncHandler(async (req, res) => {
  //GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // DESTRUCTURING NEW EMAIL & CONFIRMATION CODE FROM REQUEST BODY
  const { newEmail, code } = req.body;
  // IF EMAIL & CODE NOT SENT
  if (!newEmail || !code) {
    return res.status(400).json({
      message: "New Email & Confirmation Code are Required!",
      success: false,
    });
  }
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // MATCHING THE CODE SENT WITH THE ONE SAVED IN CONFIRMATION CODE
  if (user.confirmationCode !== code) {
    return res
      .status(400)
      .json({ message: "Invalid Confirmation Code Provided!", success: false });
  }
  // CHECKING IF THE CONFIRMATION CODE HAS EXPIRED OR NOT
  if (
    !user.confirmationCodeExpiresIn ||
    user.confirmationCodeExpiresIn < Date.now()
  ) {
    return res
      .status(400)
      .json({ message: "Confirmation Code has Expired!", success: false });
  }
  // CONFIRMATION CODE GENERATOR FUNCTION
  const generateConfirmationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  // CONFIRMATION CODE EXPIRY TIME GENERATOR
  const expiry = Date.now() + 15 * 60 * 1000;
  // GENERATING A CONFIRMATION CODE
  const confirmationCode = generateConfirmationCode();
  // SETTING THE USER CONFIRMATION CODE FOR VERIFICATION
  user.confirmationCode = confirmationCode;
  // SETTING THE USER CONFIRMATION CODE EXPIRY
  user.confirmationCodeExpiresIn = expiry;
  // SETTING THE NEW EMAIL IN PENDING STATE
  user.pendingNewEmail = newEmail;
  // SAVING THE USER
  await user.save();
  // SENDING NEW EMAIL ADD REQUESTED EMAIL WITH USER'S DETAILS
  try {
    await sendNewEmailAddRequestEmail(newEmail, user, confirmationCode);
  } catch (error) {
    console.error("Error Sending New Email Add Request Email", error);
    return res.status(500).json({
      message: "Error Sending New Email Add Request Email",
      success: false,
    });
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Email Verification Code Sent to your new Email!",
    success: true,
  });
});

// <= FINALIZE NEW EMAIL UPDATE =>
export const finalizeEmailUpdate = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // DESTRUCTURING NEW EMAIL & CONFIRMATION CODE FROM REQUEST BODY
  const { newEmail, code } = req.body;
  // IF NEW EMAIL & CODE NOT PROVIDED
  if (!newEmail || !code) {
    return res.status(400).json({
      message: "New Email & Confirmation Code are Required!",
      success: false,
    });
  }
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const user = await User.findById(userId).exec();
  // IF NO USER FOUND
  if (!user) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // CHECKING IF THE EMAIL PROVIDED MATCHES THE PENDING EMAIL FOR THE USER
  if (newEmail !== user.pendingNewEmail) {
    return res
      .status(400)
      .json({ message: "No Email Update Request Found!", success: false });
  }
  // MATCHING THE CODE SENT WITH THE ONE SAVED IN CONFIRMATION CODE
  if (user.confirmationCode !== code) {
    return res
      .status(400)
      .json({ message: "Invalid Confirmation Code Provided!", success: false });
  }
  // CHECKING IF THE CONFIRMATION CODE HAS EXPIRED OR NOT
  if (
    !user.confirmationCodeExpiresIn ||
    user.confirmationCodeExpiresIn < Date.now()
  ) {
    return res
      .status(400)
      .json({ message: "Confirmation Code has Expired!", success: false });
  }
  // UPDATING THE EMAIL
  user.email = newEmail;
  // CLEARING TEMPORARY FIELDS
  user.confirmationCode = null;
  user.confirmationCodeExpiresIn = null;
  user.pendingNewEmail = null;
  // SAVING THE USER
  const updatedUser = await user.save();
  // SENDING A EMAIL UPDATED EMAIL WITH USER'S DETAILS
  try {
    await sendEmailUpdatedSuccessfulEmail(newEmail, user);
  } catch (error) {
    console.error("Error Sending Email Update Successful Email", error);
  }
  return res.status(200).json({
    message: "Email Updated Successfully!",
    success: true,
    updatedUser,
  });
});
