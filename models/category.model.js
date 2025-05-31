// <= IMPORTS =>
import slugify from "slugify";
import mongoose from "mongoose";

// <= CATEGORY SCHEMA =>
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category Name is Required!"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
  },
  { timestamps: true }
);

// <= GENERATING THE SLUG BEFORE SAVING THE CATEGORY =>
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// <= EXPORTING THE CATEGORY SCHEMA =>
export const Category = mongoose.model("Category", categorySchema);
