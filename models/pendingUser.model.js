// <= IMPORTS =>
import mongoose from "mongoose";

// <= PENDING USER SCHEMA =>
const pendingUserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phoneNumber: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["STUDENT", "RECRUITER"],
      required: true,
    },
    profile: {
      bio: { type: String },
      skills: [{ type: String }],
      resume: { type: String },
      resumeOriginalName: { type: String },
      company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
      profilePhoto: { type: String },
    },
    confirmationCode: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, expires: 3600 }
);

// <= EXPORTING PENDING USER SCHEMA =>
export const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
