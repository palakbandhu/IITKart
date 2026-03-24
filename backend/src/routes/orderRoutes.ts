import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
} from "../controllers/orderController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create order (customer only)
router.post("/", protect, authorize("CUSTOMER"), createOrder);

// Get orders
router.get("/", protect, getOrders);

// Get order by ID
router.get("/:id", protect, getOrderById);

// Update order status
router.patch("/:id/status", protect, authorize("VENDOR", "RIDER"), updateOrderStatus);

export default router;