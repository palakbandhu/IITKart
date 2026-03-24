import express from "express";
import { toggleShopStatus, updateShopSettings, getVendorDashboard, getVendorAnalytics } from "../controllers/vendorController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { Role } from "@prisma/client";

const router = express.Router();

router.patch("/toggle-status", protect, authorize(Role.VENDOR), toggleShopStatus);
router.put("/settings",   protect, authorize(Role.VENDOR), updateShopSettings);
router.get("/dashboard",  protect, authorize(Role.VENDOR), getVendorDashboard);
router.get("/analytics",  protect, authorize(Role.VENDOR), getVendorAnalytics);

export default router;
