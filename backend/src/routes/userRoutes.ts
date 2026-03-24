import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  updatePassword
} from "../controllers/userController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/profile/password", protect, updatePassword);

export default router;