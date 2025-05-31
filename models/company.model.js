// <= IMPORTS =>
import mongoose from "mongoose";

// <= COMPANY SCHEMA =>
const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    website: {
      type: String,
    },
    location: {
      type: String,
    },
    logo: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// <= EXPORTING COMPANY SCHEMA =>
export const Company = mongoose.model("Company", companySchema);
