// <= IMPORTS =>
import express from "express";
import { multipleUpload } from "../middleware/multer.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  bookmarkArticle,
  createArticle,
  deleteArticle,
  deleteContentImages,
  dislikeArticle,
  getArticleBySlug,
  getArticles,
  getBookmarkedArticles,
  getCategories,
  getLikedArticles,
  getMyArticles,
  likeArticle,
  updateArticle,
} from "../controllers/article.controller.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.get("/", getArticles);
router.get("/categories", getCategories);
router.get("/slug/:slug", getArticleBySlug);
router.get("/mine", isAuthenticated, getMyArticles);
router.post("/:id/like", isAuthenticated, likeArticle);
router.get("/likes", isAuthenticated, getLikedArticles);
router.post("/:id/dislike", isAuthenticated, dislikeArticle);
router.delete("/:id/delete", isAuthenticated, deleteArticle);
router.post("/:id/bookmark", isAuthenticated, bookmarkArticle);
router.get("/bookmarks", isAuthenticated, getBookmarkedArticles);
router.post("/image/destroy", isAuthenticated, deleteContentImages);
router.post("/create", isAuthenticated, multipleUpload, createArticle);
router.put("/:id/update", isAuthenticated, multipleUpload, updateArticle);

export default router;
