import express from "express";
import { toggleShopStatus } from "../controllers/vendorController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { Role } from "@prisma/client";

const router = express.Router();

router.patch("/toggle-status", protect, authorize(Role.VENDOR), toggleShopStatus);

export default router;