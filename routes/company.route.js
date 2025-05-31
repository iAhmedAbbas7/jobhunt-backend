// <= IMPORTS =>
import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  deleteCompany,
  getAdminCompanies,
  getAllCompanies,
  getCompanyById,
  registerCompany,
  subscribeToCompany,
  unsubscribeFromCompany,
  updateCompany,
} from "../controllers/company.controller.js";
import { singleUpload } from "../middleware/multer.js";

// <= ROUTER =>
const router = express.Router();

// <= ROUTES =>
router.route("/register").post(isAuthenticated, registerCompany);
router.route("/getAllCompanies").get(getAllCompanies);
router.route("/getAdminCompanies").get(isAuthenticated, getAdminCompanies);
router.route("/get/:id").get(isAuthenticated, getCompanyById);
router.route("/update/:id").put(isAuthenticated, singleUpload, updateCompany);
router.route("/subscribe/:id").post(isAuthenticated, subscribeToCompany);
router
  .route("/unsubscribe/:id")
  .delete(isAuthenticated, unsubscribeFromCompany);
router.route("/delete/:id").delete(isAuthenticated, deleteCompany);

export default router;
