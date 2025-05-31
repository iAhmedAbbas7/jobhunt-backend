// <= IMPORTS =>
import { User } from "../models/user.model.js";
import { Article } from "../models/article.model.js";
import { Comment } from "../models/comment.model.js";
import expressAsyncHandler from "express-async-handler";

// <= ACTION TOGGLER HELPER FUNCTION =>
const toggleAction = (arr, userId) => {
  // FINDING THE INDEX OF USER ID IN THE ARRAY
  const idx = arr.findIndex((u) => u.toString() === userId);
  // IF ALREADY PRESENT, THEN REMOVING IT
  if (idx >= 0) arr.splice(idx, 1);
  // IF NOT PRESENT, THEN ADDING IT
  else arr.push(userId);
};

// <= CREATE COMMENT =>
export const createComment = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING ARTICLE ID AND COMMENT CONTENT THROUGH REQUEST BODY
  const { articleId, content } = req.body;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // VALIDATING IF THE COMMENT IS EMPTY
  if (!content?.trim()) {
    return res
      .status(400)
      .json({ message: "Comment Cannot be Empty!", success: false });
  }
  // FINDING ARTICLE THROUGH ARTICLE ID
  const foundArticle = await Article.findById(articleId).exec();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // CREATING COMMENT
  const comment = await Comment.create({
    article: foundArticle._id,
    author: foundUser._id,
    content: content.trim(),
    likes: [],
    dislikes: [],
    replies: [],
  });
  // POPULATING COMMENT WITH AUTHOR DETAILS
  const populatedComment = await Comment.findById(comment._id)
    .populate("author", "fullName profile.profilePhoto")
    .exec();
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    message: "Comment Posted!",
    data: populatedComment,
  });
});

// <= GET COMMENTS FOR ARTICLE =>
export const getCommentsForArticle = expressAsyncHandler(async (req, res) => {
  // GETTING ARTICLE ID FROM REQUEST PARAMS
  const { articleId } = req.params;
  // SETTING PAGE NUMBER
  const pageNumber = Math.max(parseInt(req.query.page, 10) || 1, 1);
  // SETTING LIMIT
  const limitNumber = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  // SETTING FILTER
  const filter = { article: articleId };
  // TOTAL NUMBER OF COMMENTS
  const totalComments = await Comment.countDocuments(filter);
  // GETTING COMMENTS
  const comments = await Comment.find(filter)
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber)
    .populate("author", "fullName profile.profilePhoto")
    .populate("replies.author", "fullName profile.profilePhoto")
    .lean();
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    count: comments.length,
    totalComments,
    pageNumber,
    pages: Math.ceil(totalComments / limitNumber),
    data: comments,
  });
});

// <= DELETE COMMENT =>
export const deleteComment = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING COMMENT ID FROM REQUEST PARAMS
  const { commentId } = req.params;
  // FINDING USER IN THE USER MODEL
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING COMMENT
  const foundComment = await Comment.findById(commentId).exec();
  // IF COMMENT NOT FOUND
  if (!foundComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // FINDING ARTICLE THROUGH ARTICLE ID
  const foundArticle = await Article.findById(foundComment.article).exec();
  // IF ARTICLE NOT FOUND
  if (!foundArticle) {
    return res
      .status(404)
      .json({ message: "Article Not Found!", success: false });
  }
  // SETTING COMMENT AUTHOR
  const isCommentAuthor = foundComment.author.toString() === userId;
  // SETTING ARTICLE AUTHOR
  const isArticleAuthor = foundArticle.author.toString() === userId;
  // ALLOWING COMMENT TO BE DELETED BY BOTH COMMENT & ARTICLE AUTHOR
  if (!isCommentAuthor && !isArticleAuthor) {
    return res.status(403).json({ message: "Access Denied", success: false });
  }
  // DELETING THE COMMENT
  await foundComment.deleteOne();
  // RETURNING RESPONSE
  return res.status(200).json({ message: "Comment Deleted!", success: true });
});

// <= EDIT COMMENT =>
export const editComment = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING COMMENT ID FROM REQUEST PARAMS
  const { commentId } = req.params;
  // GETTING UPDATED CONTENT FROM REQUEST BODY
  const { content } = req.body;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING COMMENT THROUGH COMMENT ID
  const foundComment = await Comment.findById(commentId).exec();
  // IF COMMENT NOT FOUND
  if (!foundComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // VALIDATING IF THE COMMENT IS EMPTY
  if (!content?.trim()) {
    return res
      .status(400)
      .json({ message: "Comment Cannot be Empty!", success: false });
  }
  // CHECKING IF THE COMMENT IS BEING EDITED BY THE OWNER OF THE COMMENT
  if (foundComment.author.toString() !== userId) {
    return res.status(403).json({ message: "Access Denied!", success: false });
  }
  // UPDATING THE COMMENT CONTENT
  foundComment.content = content.trim();
  // SAVING THE UPDATED TIME
  foundComment.updatedAt = Date.now();
  // SAVING THE COMMENT
  await foundComment.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Comment Edited!",
    success: true,
    _id: foundComment._id,
    content: foundComment.content,
    updatedAt: foundComment.updatedAt,
  });
});

// <= LIKE COMMENT =>
export const likeComment = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING COMMENT ID FROM REQUEST PARAMS
  const { commentId } = req.params;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING COMMENT THROUGH COMMENT ID
  const foundComment = await Comment.findById(commentId).exec();
  // IF COMMENT NOT FOUND
  if (!foundComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // PREVENTING LIKING OWN COMMENT
  if (foundComment.author.toString() === userId) {
    return res
      .status(400)
      .json({ message: "Cannot Like Your Own Comment!", success: false });
  }
  // REMOVING DISLIKE ON LIKE
  foundComment.dislikes = foundComment.dislikes.filter(
    (u) => u.toString() !== userId
  );
  // TOGGLING LIKE
  toggleAction(foundComment.likes, userId);
  // SAVING COMMENT
  await foundComment.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    likesCount: foundComment.likes.length,
    dislikesCount: foundComment.dislikes.length,
  });
});

// <= DISLIKE COMMENT =>
export const dislikeComment = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING COMMENT ID FROM REQUEST PARAMS
  const { commentId } = req.params;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING COMMENT THROUGH COMMENT ID
  const foundComment = await Comment.findById(commentId).exec();
  // IF COMMENT NOT FOUND
  if (!foundComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // PREVENTING LIKING OWN COMMENT
  if (foundComment.author.toString() === userId) {
    return res
      .status(400)
      .json({ message: "Cannot Dislike Your Own Comment!", success: false });
  }
  // REMOVING DISLIKE ON LIKE
  foundComment.likes = foundComment.likes.filter(
    (u) => u.toString() !== userId
  );
  // TOGGLING LIKE
  toggleAction(foundComment.dislikes, userId);
  // SAVING COMMENT
  await foundComment.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    likesCount: foundComment.likes.length,
    dislikesCount: foundComment.dislikes.length,
  });
});

// <= PIN COMMENT =>
export const pinComment = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING COMMENT ID FROM REQUEST PARAMS
  const { commentId } = req.params;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING COMMENT THROUGH COMMENT ID
  const foundComment = await Comment.findById(commentId)
    .populate("article", "author")
    .exec();
  // IF COMMENT NOT FOUND
  if (!foundComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // ALLOWING ONLY ARTICLE AUTHOR TO PIN COMMENTS
  if (foundComment.article.author === userId) {
    return res.status(400).json({
      message: "Only Article Author can Pin Comments!",
      success: false,
    });
  }
  // REMOVING PIN FROM ANY OTHER COMMENT
  await Comment.updateMany(
    { article: foundComment.article._id, pinned: true },
    { $set: { pinned: false } }
  );
  // TOGGLING COMMENTS PIN STATUS
  foundComment.pinned = !foundComment.pinned;
  // SAVING THE COMMENT
  await foundComment.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    pinnedCommentId: foundComment.pinned ? foundComment._id : null,
  });
});

// <= REPLY TO COMMENT =>
export const replyToComment = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING PARENT COMMENT ID
  const { commentId } = req.params;
  // GETTING REPLY COMMENT CONTENT FROM REQUEST BODY
  const { content } = req.body;
  // FINDING USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // IF CONTENT IS EMPTY
  if (!content?.trim()) {
    return res
      .status(400)
      .json({ message: "Reply Cannot be Empty!", success: false });
  }
  // FINDING THE PARENT COMMENT THROUGH COMMENT ID
  const foundComment = await Comment.findById(commentId)
    .populate("article", "author")
    .exec();
  // IF PARENT COMMENT NOT FOUND
  if (!foundComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // ADDING REPLY TO PARENT MESSAGE REPLIES
  foundComment.replies.unshift({ content, author: userId });
  // SAVING COMMENT
  await foundComment.save();
  // POPULATING THE PARENT COMMENT AND REPLY
  await foundComment.populate([
    { path: "author", select: "fullName profile.profilePhoto" },
    { path: "replies.author", select: "fullName profile.profilePhoto" },
  ]);
  // GETTING THE NEWLY ADDED REPLY
  const newReply = foundComment.replies[0];
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Reply Posted!", success: true, data: newReply });
});

// <= LIKE REPLY =>
export const likeReply = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING PARENT COMMENT ID AND REPLY COMMENT ID FROM REQUEST PARAMS
  const { commentId, replyId } = req.params;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING THE PARENT COMMENT THROUGH COMMENT ID
  const parentComment = await Comment.findById(commentId).exec();
  // IF PARENT COMMENT NOT FOUND
  if (!parentComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // FINDING THE REPLY COMMENT
  const reply = parentComment.replies.id(replyId);
  // IF REPLY NOT FOUND
  if (!reply) {
    return res
      .status(404)
      .json({ message: "Reply Not Found!", success: false });
  }
  // FORCING THE DELETION OF USER'S OWN REPLY COMMENT
  if (reply.author.toString() === userId) {
    return res
      .status(400)
      .json({ message: "You Cannot Like Your Own Reply!", success: false });
  }
  // REMOVING DISLIKE ON LIKE
  reply.dislikes = reply.dislikes.filter((u) => u.toString() !== userId);
  // TOGGLING LIKE
  toggleAction(reply.likes, userId);
  // SAVING COMMENT
  await parentComment.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    likesCount: reply.likes.length,
    dislikesCount: reply.dislikes.length,
  });
});

// <= DISLIKE REPLY =>
export const dislikeReply = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING PARENT COMMENT ID AND REPLY COMMENT ID FROM REQUEST PARAMS
  const { commentId, replyId } = req.params;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING THE PARENT COMMENT THROUGH COMMENT ID
  const parentComment = await Comment.findById(commentId).exec();
  // IF PARENT COMMENT NOT FOUND
  if (!parentComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // FINDING THE REPLY COMMENT
  const reply = parentComment.replies.id(replyId);
  // IF REPLY NOT FOUND
  if (!reply) {
    return res
      .status(404)
      .json({ message: "Reply Not Found!", success: false });
  }
  // FORCING THE DELETION OF USER'S OWN REPLY COMMENT
  if (reply.author.toString() === userId) {
    return res
      .status(400)
      .json({ message: "You Cannot Dislike Your Own Reply!", success: false });
  }
  // REMOVING DISLIKE ON LIKE
  reply.likes = reply.likes.filter((u) => u.toString() !== userId);
  // TOGGLING LIKE
  toggleAction(reply.dislikes, userId);
  // SAVING COMMENT
  await parentComment.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    success: true,
    likesCount: reply.likes.length,
    dislikesCount: reply.dislikes.length,
  });
});

// <= PIN REPLY =>
export const pinReply = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING PARENT COMMENT ID AND REPLY COMMENT ID FROM REQUEST PARAMS
  const { commentId, replyId } = req.params;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING THE PARENT COMMENT THROUGH COMMENT ID
  const parentComment = await Comment.findById(commentId).exec();
  // IF PARENT COMMENT NOT FOUND
  if (!parentComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // FINDING THE REPLY COMMENT
  const reply = parentComment.replies.id(replyId);
  // IF REPLY NOT FOUND
  if (!reply) {
    return res
      .status(404)
      .json({ message: "Reply Not Found!", success: false });
  }
  // FORCING THE PIN ACTION TO BE ONLY ALLOWED BY THE COMMENT OWNER
  if (parentComment.author.toString() !== userId) {
    return res.status(400).json({ message: "Access Denied!", success: false });
  }
  // IF THE REPLY IS ALREADY PINNED, UNPINNING IT
  const newPinnedId = reply.pinned ? null : replyId;
  // CLEARING ANY OTHER PINS FROM REPLIES
  parentComment.replies.forEach((r) => {
    r.pinned = false;
  });
  // IF PINNING ACTION, THEN PINNING
  if (newPinnedId) parentComment.replies.id(newPinnedId).pinned = true;
  // SORTING THE REPLIES WITH PINNED AT TOP, OTHERWISE SORTING ON CREATED AT
  parentComment.replies.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });
  // SAVING THE COMMENT
  await parentComment.save();
  // RETURNING RESPONSE
  res.json({ success: true, pinnedReplyId: newPinnedId });
});

// <= EDIT REPLY =>
export const editReply = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING PARENT COMMENT ID AND REPLY COMMENT ID FROM REQUEST PARAMS
  const { commentId, replyId } = req.params;
  // GETTING UPDATED CONTENT FROM REQUEST BODY
  const { content } = req.body;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING THE PARENT COMMENT THROUGH COMMENT ID
  const parentComment = await Comment.findById(commentId).exec();
  // IF PARENT COMMENT NOT FOUND
  if (!parentComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // VALIDATING IF THE COMMENT IS EMPTY
  if (!content?.trim()) {
    return res
      .status(400)
      .json({ message: "Comment Cannot be Empty!", success: false });
  }
  // FINDING THE REPLY COMMENT
  const reply = parentComment.replies.id(replyId);
  // IF REPLY NOT FOUND
  if (!reply) {
    return res
      .status(404)
      .json({ message: "Reply Not Found!", success: false });
  }
  // FORCING THE DELETION OF USER'S OWN REPLY COMMENT
  if (reply.author.toString() !== userId) {
    return res.status(400).json({ message: "Access Denied", success: false });
  }
  // UPDATING THE COMMENT CONTENT
  reply.content = content.trim();
  // SAVING THE UPDATED TIME
  reply.updatedAt = Date.now();
  // SAVING THE COMMENT
  await parentComment.save();
  // RETURNING RESPONSE
  return res.status(200).json({
    message: "Reply Edited!",
    success: true,
    _id: reply._id,
    content: reply.content,
    updatedAt: reply.updatedAt,
  });
});

// <= DELETE REPLY =>
export const deleteReply = expressAsyncHandler(async (req, res) => {
  // GETTING CURRENT LOGGED IN USER ID
  const userId = req.id;
  // GETTING PARENT COMMENT ID AND REPLY COMMENT ID FROM REQUEST PARAMS
  const { commentId, replyId } = req.params;
  // FINDING THE USER IN THE USER MODEL THROUGH USER ID
  const foundUser = await User.findById(userId).exec();
  // IF USER NOT FOUND
  if (!foundUser) {
    return res.status(404).json({ message: "User Not Found!", success: false });
  }
  // FINDING THE PARENT COMMENT THROUGH COMMENT ID
  const parentComment = await Comment.findById(commentId).exec();
  // IF PARENT COMMENT NOT FOUND
  if (!parentComment) {
    return res
      .status(404)
      .json({ message: "Comment Not Found!", success: false });
  }
  // FINDING THE REPLY COMMENT
  const reply = parentComment.replies.id(replyId);
  // IF REPLY NOT FOUND
  if (!reply) {
    return res
      .status(404)
      .json({ message: "Reply Not Found!", success: false });
  }
  // FORCING THE DELETION OF USER'S OWN REPLY COMMENT
  if (reply.author.toString() !== userId) {
    return res
      .status(400)
      .json({ message: "You Cannot Delete Other's Reply!", success: false });
  }
  // REMOVING THE REPLY
  await reply.deleteOne();
  // SAVING THE COMMENT
  await parentComment.save();
  // RETURNING RESPONSE
  return res
    .status(200)
    .json({ message: "Reply Deleted Successfully!", success: true });
});
