import express from "express";
import { createProduct, getVendorProducts } from "../controllers/productController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { updateProduct } from "../controllers/productController.js";
import { deleteProduct } from "../controllers/productController.js";
import { getAllProducts } from "../controllers/productController.js";
import { Role } from "@prisma/client";

const router = express.Router();

// GET Vendor Products
router.get("/vendor", protect, authorize(Role.VENDOR), getVendorProducts);

// Create Product API
router.post("/", protect, authorize(Role.VENDOR), createProduct);


//API for listing products for consumers
router.get("/", getAllProducts);

//Update product API
router.put("/:id", protect, authorize(Role.VENDOR), updateProduct);

//DELETE product API
router.delete("/:id", protect, authorize(Role.VENDOR), deleteProduct);
export default router;