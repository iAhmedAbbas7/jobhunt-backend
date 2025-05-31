// <= IMPORTS =>
import slugify from "slugify";
import mongoose from "mongoose";

// <= SECTION SCHEMA =>
const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String },
    imagePublicId: { type: String },
  },
  { _id: false }
);

// <= ARTICLE SCHEMA =>
const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is Required!"],
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    bannerUrl: {
      type: String,
      required: [true, "Banner Image is Required!"],
    },
    bannerPublicId: { type: String },
    sections: [
      {
        type: [sectionSchema],
        validate: (v) => v.length > 0,
      },
    ],
    plainContent: {
      type: String,
      default: "",
      select: false,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categories: [
      {
        type: String,
        trim: true,
        required: true,
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// <= GENERATING THE SLUG & PLAIN CONTENT BEFORE SAVING THE ARTICLE =>
articleSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
    });
  }
  this.plainContent = this.sections
    .flat()
    .map((sec) =>
      sec.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .join(" ");
  next();
});

// <= MAKING FULL TEXT INDEX FOR SEARCH =>
articleSchema.index(
  { title: "text", plainContent: "text" },
  { name: "TitleAndPlainBodyTextIndex", default_language: "english" }
);

// <= EXPORTING THE ARTICLE SCHEMA =>
export const Article = mongoose.model("Article", articleSchema);
