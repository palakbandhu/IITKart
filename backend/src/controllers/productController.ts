import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import { SearchEngine } from "../utils/SearchEngine.js";

// 1. Initialize Prisma Client globally at the top
const prisma = new PrismaClient();

/*-----------------------------------------------
  CREATE PRODUCT (Authorized Vendors Only)
------------------------------------------------*/
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, price, description, stock } = req.body;

    // Find vendor profile of logged-in user
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        price,
        description,
        stock,
        vendorId: vendor.id,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("createProduct error:", error);
    res.status(500).json({ message: "Error creating product" });
  }
};

/*-----------------------------------------------
  GET VENDOR PRODUCTS (Authorized Vendors Only)
------------------------------------------------*/
export const getVendorProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found" });
      return;
    }

    const products = await prisma.product.findMany({
      where: { vendorId: vendor.id },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error("getVendorProducts error:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
};

/*-----------------------------------------------
  UPDATE PRODUCT (Authorized Vendors Only)
------------------------------------------------*/
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params.id);
    const { name, price, description, stock } = req.body;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found" });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Strict ownership check
    if (product.vendorId !== vendor.id) {
      res.status(403).json({ message: "Not authorized to update this product" });
      return;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { name, price, description, stock },
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("updateProduct error:", error);
    res.status(500).json({ message: "Error updating product" });
  }
};

/*-----------------------------------------------
  DELETE PRODUCT (Authorized Vendors Only)
------------------------------------------------*/
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params.id);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      res.status(404).json({ message: "Vendor profile not found" });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Strict ownership check
    if (product.vendorId !== vendor.id) {
      res.status(403).json({ message: "Not authorized to delete this product" });
      return;
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("deleteProduct error:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
};

/*-----------------------------------------------
  GET ALL PRODUCTS (Consumers - Semantic Search & Pagination)
------------------------------------------------*/
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawSearch = (req.query.search as string) || "";
    let minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    let maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

    // 1. Extract intents from natural language
    const intents = SearchEngine.extractIntents(rawSearch);
    if (intents.maxPrice) maxPrice = intents.maxPrice;
    if (intents.minPrice) minPrice = intents.minPrice;

    // 2. Base Database Filtering
    const whereClause: any = {
      isAvailable: true,
      vendor: { isOpen: true },
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.price = {};
      if (minPrice !== undefined) whereClause.price.gte = minPrice;
      if (maxPrice !== undefined) whereClause.price.lte = maxPrice;
    }

    // Fetch candidate products
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: { shopName: true, shopType: true },
        },
      },
    });

    // 3. Semantic Scoring & Ranking
    let processedData = products;

    if (rawSearch.trim()) {
      const tokens = SearchEngine.tokenize(rawSearch);
      const expandedTokens = SearchEngine.expandQuery(tokens);

      processedData = products
        .map((p) => ({
          ...p,
          score: SearchEngine.scoreProduct(p, expandedTokens, rawSearch),
        }))
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score);
    } else {
       processedData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // 4. Pagination
    const skip = (page - 1) * limit;
    const totalItems = processedData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const paginatedData = processedData.slice(skip, skip + limit);

    const cleanData = paginatedData.map(({ score, ...rest }) => rest);

    // 5. Response
    res.status(200).json({
      data: cleanData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error("getAllProducts error:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
};