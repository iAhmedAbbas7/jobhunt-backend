// <= IMPORTS =>
import slugify from "slugify";
import getDataURI from "../utils/dataURI.js";
import { User } from "../models/user.model.js";
import cloudinary from "../utils/cloudinary.js";
import { Article } from "../models/article.model.js";
import { Comment } from "../models/comment.model.js";
import { Category } from "../models/category.model.js";
import expressAsyncHandler from "express-async-handler";

// <= DEFAULT CATEGORIES =>
const DEFAULT_CATEGORIES = [
  "JavaScript",
  "Node.js",
  "Express",
  "React.js",
  "MongoDB",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Bootstrap",
  "Git",
  "Github",
  "Material UI",
  "Career Advice",
  "Interview Tips",
  "Resume Building",
  "Data Science",
  "Web Development",
  "Frontend Developer",
  "Backend Developer",
  "Fullstack Developer",
  "MERN Stack Developer",
  "UI/UX Design",
  "Graphic Design",
  "Figma",
  "Adobe Illustrator",
];

// <= CREATE ARTICLE =>
export const createArticle = expressAsyncHandler(async (req, res) => {
  // GETTING THE CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // CHECKING THE USER ROLE
  if (foundUser.role.toString() !== "RECRUITER") {
    return res.status(400).json({ message: "Access Denied!", success: false });
  }
  // GETTING DATA FROM REQUEST BODY
  const { title, categories, sectionsData } = req.body;
  // IF TITLE NOT PROVIDED
  if (!title) {
    return res
      .status(400)
      .json({ message: "Article Title is Required!", success: false });
  }
  // IF SECTION DATA IS MISSING
  if (!sectionsData) {
    return res
      .status(400)
      .json({ message: "Section Data is Required!", success: false });
  }
  // HANDLING CATEGORIES
  let parsedCategories = [];
  // IF CATEGORIES IS OF STRING TYPE
  if (typeof categories === "string") {
    try {
      // PARSING CATEGORIES
      parsedCategories = JSON.parse(categories);
    } catch {
      // SPLITTING CATEGORIES AT COMMA
      parsedCategories = categories.split(",").map((c) => c.trim());
    }
  }
  // IF CATEGORIES IS OF ARRAY TYPE
  else if (Array.isArray(categories)) {
    parsedCategories = categories;
  }
  // IF NO CATEGORIES WERE SENT
  if (parsedCategories.length === 0) {
    return res
      .status(400)
      .json({ message: "At Least One Category is Required!", success: false });
  }
  // PARSING SECTIONS DATA
  let sections = [];
  try {
    sections = JSON.parse(sectionsData);
  } catch {
    return res
      .status(400)
      .json({ message: "Invalid Section Data!", success: false });
  }
  // IF NO SECTION DATA WAS SENT
  if (!Array.isArray(sections) || sections.length === 0) {
    return res
      .status(400)
      .json({ message: "At Least One Section is Required!", success: false });
  }
  // BANNER UPLOAD HANDLING
  const bannerFile = req.files?.banner?.[0];
  // IF BANNER FILE NOT PROVIDED
  if (!bannerFile) {
    return res
      .status(400)
      .json({ message: "Banner Image is Required!", success: false });
  }
  // GETTING DATA URI FOR BANNER IMAGE
  const bannerURI = getDataURI(bannerFile);
  // UPLOADING TO CLOUDINARY
  const cloudResponse = await cloudinary.uploader.upload(bannerURI.content);
  // SETTING BANNER IMAGE URL
  const bannerUrl = cloudResponse.secure_url;
  // SETTING BANNER IMAGE PUBLIC URL
  const bannerPublicId = cloudResponse.public_id;
  // SELECTING SECTION IMAGES
  const sectionFiles = req.files?.sectionImages || [];
  // SECTION FILE UPLOAD HANDLING
  sections = await Promise.all(
    sections.map(async (sec, idx) => {
      // IF SECTION HEADING & CONTENT ARE MISSING
      if (!sec.heading || !sec.content) {
        return res.status(400).json({
          message: "Each Section must have a Heading & Content",
          success: false,
        });
      }
      // INITIALIZING IMAGE URL FOR FOR EACH FILE
      let imageUrl = null;
      // INITIALIZING IMAGE PUBLIC ID FOR EACH FILE
      let imagePublicId = null;
      // SELECTING FILES
      const file = sectionFiles[idx];
      // IF FILE FOUND
      if (file) {
        // GETTING FILE URI
        const fileURI = getDataURI(file);
        // UPLOADING TO CLOUDINARY
        const cloudResponse = await cloudinary.uploader.upload(fileURI.content);
        // SETTING IMAGE URL
        imageUrl = cloudResponse.secure_url;
        // SETTING PUBLIC ID
        imagePublicId = cloudResponse.public_id;
      }
      // RETURNING RESPONSE FROM UPLOAD
      return {
        heading: sec.heading,
        content: sec.content,
        imageUrl,
        imagePublicId,
      };
    })
  );
  // CREATING ARTICLE
  const article = await Article.create({
    title,
    slug: slugify(title, { lower: true, strict: true }),
    bannerUrl,
    bannerPublicId,
    categories: parsedCategories,
    sections,
    author: foundUser._id,
  });
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Article Published Successfully!",
    success: true,
    article,
  });
});

// <= GET ARTICLES =>
export const getArticles = expressAsyncHandler(async (req, res) => {
  // SETTING QUERY TO FETCH ARTICLES
  const { page = 1, limit = 10, search, category } = req.query;
  // SETTING PAGE NUMBER
  const pageNumber = Math.max(parseInt(page, 10), 1);
  // SETTING LIMIT NUMBER
  const limitNumber = Math.max(parseInt(limit, 10), 1);
  // BUILDING THE FILTER
  const filter = {};
  // IF SEARCH BY CATEGORY
  if (category) filter.categories = category;
  // IF SEARCH BY TEXT
  if (search) filter.$text = { $search: search };
  // GETTING TOTAL NUMBER OF ARTICLES FOR USER
  const totalArticles = await Article.countDocuments(filter);
  // FETCHING ARTICLES FOR PAGE NUMBER
  const articles = await Article.find(filter)
    .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber)
    .populate("author", "fullName profile.profilePhoto")
    .lean();
  // IF NO ARTICLES FOUND
  if (articles.length === 0) {
    return res
      .status(404)
      .json({ message: "No Articles Found!", success: false });
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    totalArticles,
    count: articles.length,
    page: pageNumber,
    pages: Math.ceil(totalArticles / limitNumber),
    data: articles,
  });
});

// <= GET MY ARTICLES =>
export const getMyArticles = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // SETTING QUERY TO FETCH ARTICLES
  const { page = 1, limit = 10, search, category } = req.query;
  // SETTING PAGE NUMBER
  const pageNumber = Math.max(parseInt(page, 10), 1);
  // SETTING LIMIT NUMBER
  const limitNumber = Math.max(parseInt(limit, 10), 1);
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser)
    return res.status(404).json({ message: "User Not Found!", success: false });
  // BUILDING THE FILTER
  const filter = { author: userId };
  // IF SEARCH BY CATEGORY
  if (category) filter.categories = category;
  // IF SEARCH BY TEXT
  if (search) filter.$text = { $search: search };
  // GETTING TOTAL NUMBER OF ARTICLES FOR USER
  const totalArticles = await Article.countDocuments(filter);
  // FETCHING ARTICLES FOR PAGE NUMBER
  const articles = await Article.find(filter)
    .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber)
    .populate("author", "fullName profile.profilePhoto")
    .lean();
  // IF NO ARTICLES FOUND
  if (articles.length === 0) {
    return res
      .status(404)
      .json({ message: "No Articles Found!", success: false });
  }
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    totalArticles,
    count: articles.length,
    page: pageNumber,
    pages: Math.ceil(totalArticles / limitNumber),
    data: articles,
  });
});

// <= GET ARTICLE BY SLUG =>
export const getArticleBySlug = expressAsyncHandler(async (req, res) => {
  // GETTING ARTICLE SLUG FROM REQUEST PARAMS
  const { slug } = req.params;
  // FINDING THE ARTICLE THROUGH SLUG
  const foundArticle = await Article.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate("author", "fullName profile.profilePhoto")
    .lean();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // COUNTING THE COMMENTS FOR THE FOUND ARTICLE
  const commentsCount = await Comment.countDocuments({
    article: foundArticle._id,
  });
  // FETCHING FOUR MORE ARTICLES BY THE SAME AUTHOR
  const moreFromAuthor = await Article.find({
    author: foundArticle.author._id,
    _id: { $ne: foundArticle._id },
  })
    .populate("author", "fullName profile.profilePhoto")
    .sort({ createdAt: -1 })
    .limit(4);
  // RETURNING RESPONSE
  return res.json({
    success: true,
    data: { ...foundArticle, moreFromAuthor, commentsCount },
  });
});

// <= GET BOOKMARKED ARTICLES =>
export const getBookmarkedArticles = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // GETTING BOOKMARKED ARTICLES FOR THE USER IF ANY
  const bookmarkedArticles = await Article.find({ bookmarks: userId })
    .sort({ createdAt: -1 })
    .populate("author", "fullName profile.profilePhoto")
    .lean();
  // IF NO ARTICLES BOOKMARKED
  if (!bookmarkedArticles) {
    return res
      .status(404)
      .json({ message: "No BookmarkedArticles Found!", success: false });
  }
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, bookmarkedArticles });
});

// <= BOOKMARK ARTICLE =>
export const bookmarkArticle = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ARTICLE ID FROM REQUEST PARAMS
  const { id } = req.params;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING ARTICLE THROUGH ARTICLE ID
  const foundArticle = await Article.findById(id).exec();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // FINDING THE INDEX OF USER ID IN THE BOOKMARKS OF ARTICLE
  const idx = foundArticle.bookmarks.indexOf(userId);
  // IF ALREADY BOOKMARKED, REMOVING
  if (idx >= 0) foundArticle.bookmarks.splice(idx, 1);
  // IF NOT ALREADY BOOKMARKED, SAVING
  else foundArticle.bookmarks.push(userId);
  // SAVING THE ARTICLE
  await foundArticle.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: idx >= 0 ? "Bookmark Removed!" : "Article Bookmarked!",
    success: true,
    count: foundArticle.bookmarks.length,
  });
});

// <= GET LIKED ARTICLES =>
export const getLikedArticles = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // GETTING BOOKMARKED ARTICLES FOR THE USER IF ANY
  const likedArticles = await Article.find({ likes: userId })
    .sort({ createdAt: -1 })
    .populate("author", "fullName profile.profilePhoto")
    .lean();
  // IF NO ARTICLES BOOKMARKED
  if (!likedArticles) {
    return res
      .status(404)
      .json({ message: "No Liked Articles Found!", success: false });
  }
  // RETURNING RESPONSE
  return res.status(200).json({ success: true, likedArticles });
});

// <= LIKE ARTICLE =>
export const likeArticle = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ARTICLE ID FROM REQUEST PARAMS
  const { id } = req.params;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING ARTICLE THROUGH ARTICLE ID
  const foundArticle = await Article.findById(id).exec();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // REMOVE ANY DISLIKES IF ANY ON THE ARTICLE FROM THE USER
  foundArticle.dislikes = foundArticle.dislikes.filter(
    (d) => d.toString() !== userId
  );
  // TOGGLING LIKE
  if (foundArticle.likes.includes(userId)) {
    foundArticle.likes = foundArticle.likes.filter(
      (l) => l.toString() !== userId
    );
  } else {
    foundArticle.likes.push(userId);
  }
  // SAVING THE ARTICLE
  await foundArticle.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: foundArticle.likes.includes(userId)
      ? "Article Liked!"
      : "Like Removed!",
    success: true,
    likesCount: foundArticle.likes.length,
    dislikesCount: foundArticle.dislikes.length,
  });
});

// <= DISLIKE ARTICLE =>
export const dislikeArticle = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ARTICLE ID FROM REQUEST PARAMS
  const { id } = req.params;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING ARTICLE THROUGH ARTICLE ID
  const foundArticle = await Article.findById(id).exec();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // REMOVE ANY LIKES IF ANY ON THE ARTICLE FROM THE USER
  foundArticle.likes = foundArticle.likes.filter(
    (d) => d.toString() !== userId
  );
  // TOGGLING DISLIKE
  if (foundArticle.dislikes.includes(userId)) {
    foundArticle.dislikes = foundArticle.dislikes.filter(
      (l) => l.toString() !== userId
    );
  } else {
    foundArticle.dislikes.push(userId);
  }
  // SAVING THE ARTICLE
  await foundArticle.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: foundArticle.dislikes.includes(userId)
      ? "Article Disliked!"
      : "Dislike Removed!",
    success: true,
    likesCount: foundArticle.likes.length,
    dislikesCount: foundArticle.dislikes.length,
  });
});

// <= UPDATE ARTICLE =>
export const updateArticle = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ARTICLE ID FROM REQUEST PARAMS
  const { id } = req.params;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING THE ARTICLE THROUGH ARTICLE ID
  const foundArticle = await Article.findById(id).exec();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // CHECKING IF THE ARTICLE IS PUBLISHED BY THE SAME USER
  if (foundArticle.author.toString() !== userId) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // GETTING UPDATES DATA FROM REQUEST BODY
  const { title, categories, sectionsData } = req.body;
  // INITIALIZING UPDATES OBJECT
  let updates = {};
  // TITLE VALIDATION
  if (title !== undefined) {
    if (title.trim() === "") {
      return res
        .status(400)
        .json({ message: "Title Cannot be Empty!", success: false });
    }
    // SETTING TITLE
    updates.title = title;
    // UPDATING THE SLUG FOR THE ARTICLE
    updates.slug = slugify(title, { lower: true, strict: true });
  }
  // CATEGORIES VALIDATION
  if (categories !== undefined) {
    // INITIALIZING CATEGORIES ARRAY
    let parsedCategories = [];
    // IF CATEGORIES IS OF STRING TYPE
    if (typeof categories === "string") {
      try {
        // PARSING CATEGORIES
        parsedCategories = JSON.parse(categories);
      } catch {
        // SPLITTING CATEGORIES AT COMMA
        parsedCategories = categories
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
      }
    }
    // IF CATEGORIES IS OF ARRAY TYPE
    else if (Array.isArray(categories)) {
      parsedCategories = categories;
    }
    // IF NO CATEGORIES WERE SENT
    if (parsedCategories.length === 0) {
      return res.status(400).json({
        message: "At Least One Category is Required!",
        success: false,
      });
    }
    // SETTING CATEGORIES
    updates.categories = parsedCategories;
  }
  // BANNER UPLOAD HANDLING
  const bannerFile = req.files?.banner?.[0];
  // IF BANNER FILE IS PROVIDED
  if (bannerFile) {
    // DELETING THE OLD BANNER IMAGE FROM CLOUDINARY
    if (foundArticle.bannerPublicId) {
      await cloudinary.uploader
        .destroy(foundArticle.bannerPublicId)
        .catch(() => {});
    }
    // GETTING DATA URI FOR BANNER IMAGE
    const bannerURI = getDataURI(bannerFile);
    // UPLOADING TO CLOUDINARY
    const cloudResponse = await cloudinary.uploader.upload(bannerURI.content);
    // SETTING BANNER IMAGE URL
    updates.bannerUrl = cloudResponse.secure_url;
    // SETTING BANNER PUBLIC ID
    updates.bannerPublicId = cloudResponse.public_id;
  }
  // SECTION DATA VALIDATION
  if (sectionsData !== undefined) {
    // PARSING SECTIONS DATA
    let incomingSections;
    try {
      incomingSections = JSON.parse(sectionsData);
    } catch {
      return res
        .status(400)
        .json({ message: "Invalid Section Data!", success: false });
    }
    // IF NO SECTION DATA WAS SENT
    if (!Array.isArray(incomingSections) || incomingSections.length === 0) {
      return res
        .status(400)
        .json({ message: "At Least One Section is Required!", success: false });
    }
    // EXISTING SECTIONS
    const existingSections = (foundArticle.sections || []).flat();
    // SELECTING SECTION IMAGES
    const sectionFiles = req.files?.sectionImages || [];
    // SECTION FILE UPLOAD HANDLING
    const mergedSections = await Promise.all(
      incomingSections.map(async (sec, idx) => {
        // IF SECTION HEADING & CONTENT ARE MISSING
        if (!sec.heading || !sec.content) {
          return res.status(400).json({
            message: "Each Section must have a Heading & Content",
            success: false,
          });
        }
        // IMAGE URL & IMAGE PUBLIC ID FOR FOR IMAGE OF EACH SECTIONS IF IT EXISTS
        let imageUrl = existingSections[idx]?.imageUrl || null;
        let imagePublicId = existingSections[idx]?.imagePublicId || null;
        // IF FILE FOUND
        if (sectionFiles[idx]) {
          // DELETING OLD IMAGES FROM CLOUDINARY
          if (imagePublicId) {
            await cloudinary.uploader.destroy(imagePublicId).catch(() => {});
          }
          // GETTING FILE URI
          const fileURI = getDataURI(sectionFiles[idx]);
          // UPLOADING TO CLOUDINARY
          const cloudResponse = await cloudinary.uploader.upload(
            fileURI.content
          );
          // SETTING IMAGE URL
          imageUrl = cloudResponse.secure_url;
          // SETTING IMAGE PUBLIC ID
          imagePublicId = cloudResponse.public_id;
        }
        // RETURNING RESPONSE FROM UPLOAD
        return {
          heading: sec.heading,
          content: sec.content,
          imageUrl,
          imagePublicId,
        };
      })
    );
    // SETTING SECTIONS
    updates.sections = mergedSections;
  }
  // APPLYING UPDATES TO THE ARTICLE
  Object.assign(foundArticle, updates);
  // SAVING THE ARTICLE
  await foundArticle.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Article Updated Successfully!",
    success: true,
    foundArticle,
  });
});

// <= DELETE ARTICLE =>
export const deleteArticle = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ARTICLE ID FROM REQUEST PARAMS
  const { id } = req.params;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING THE ARTICLE THROUGH ARTICLE ID
  const foundArticle = await Article.findById(id).exec();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // CHECKING IF THE ARTICLE IS PUBLISHED BY THE SAME USER
  if (foundArticle.author.toString() !== userId) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // COLLECTING ALL ARTICLE IMAGES PUBLIC ID'S TO DELETE FROM CLOUDINARY
  const toDeleteImages = [];
  // SELECTING BANNER IMAGE
  if (foundArticle.bannerPublicId) {
    toDeleteImages.push(foundArticle.bannerPublicId);
  }
  // SELECTING SECTION IMAGES
  for (const section of (foundArticle.sections || []).flat()) {
    if (section.imagePublicId) {
      toDeleteImages.push(section.imagePublicId);
    }
  }
  // COLLECTING ALL IMAGES FROM THE SECTION CONTENT AS WELL
  const html = foundArticle.sections
    .flat()
    .map((s) => s.content)
    .join(" ");
  // COLLECTING ALL IMG SRC'S
  const imageSrc = Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/g)).map(
    (m) => m[1]
  );
  // EXTRACTING PUBLIC ID'S FROM IMAGE SRC
  const publicIds = imageSrc
    .map((src) => {
      const parts = src.split("/");
      const last = parts[parts.length - 1];
      return last.split(".")[0];
    })
    .filter(Boolean);
  // DESTROYING CONTENT IMAGES
  await Promise.all(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch(() => {})
    )
  );
  // DESTROYING BANNER AND SECTION IMAGES
  await Promise.all(
    toDeleteImages.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch(() => {})
    )
  );
  // DELETING THE ARTICLE
  await foundArticle.deleteOne();
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Article Deleted Successfully!", success: true });
});

// <= GET CATEGORIES =>
export const getCategories = expressAsyncHandler(async (req, res) => {
  // COUNTING THE CATEGORIES DOCUMENTS IF PRESENT
  const count = await Category.countDocuments();
  // IF THERE ARE NO CATEGORIES
  if (count === 0) {
    // PROVIDING THE DEFAULT CATEGORIES
    const docs = DEFAULT_CATEGORIES.map((name) => ({
      name,
      slug: slugify(name, { lower: true, strict: true }),
    }));
    // ADDING RHE DEFAULT CATEGORIES TO THE DATABASE
    await Category.insertMany(docs);
  }
  // NOW GETTING THE CATEGORIES FROM THE DATABASE
  const categories = await Category.find()
    .sort({ name: 1 })
    .select("name -_id");
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ success: true, data: categories.map((c) => c.name) });
});

// <= DELETE ARTICLE CONTENT IMAGES =>
export const deleteContentImages = expressAsyncHandler(async (req, res) => {
  // GETTING PUBLIC ID FROM REQUEST BODY
  const { publicId } = req.body;
  // IF NO PUBLIC ID
  if (!publicId) {
    return res
      .status(400)
      .json({ message: "Image Public ID is Required!", success: false });
  }
  // DESTROYING IMAGE FROM CLOUDINARY
  await cloudinary.uploader.destroy(publicId).catch(() => {});
  // RETURNING RESPONSE
  return res.json({ success: true });
});
