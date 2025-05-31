// <= IMPORTS =>
import mongoose from "mongoose";

// <= USER SCHEMA =>
const userSchema = new mongoose.Schema(
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
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
    confirmationCode: {
      type: String,
      default: null,
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    lastSeen: { type: Date, default: Date.now },
    totpSecret: {
      type: String,
      default: "",
    },
    confirmationCodeExpiresIn: {
      type: Number,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    pendingNewEmail: {
      type: String,
    },
  },
  { timestamps: true }
);

// EXCLUDING PASSWORD FROM USER OBJECT WHENEVER IT IS BEING SENT AS JSON RESPONSE
userSchema.set("toJSON", {
  transform: function (_doc, ret, _options) {
    delete ret.password;
    delete ret.confirmationCode;
    delete ret.confirmationCodeExpiresIn;
    delete ret.pendingNewEmail;
    delete ret.totpSecret;
    return ret;
  },
});

// <= EXPORTING USER SCHEMA =>
export const User = mongoose.model("User", userSchema);
