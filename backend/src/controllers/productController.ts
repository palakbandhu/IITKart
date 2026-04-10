import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import { SearchEngine } from '../utils/SearchEngine.js';

// ─── POST /api/products  (vendor only) ────────────────────────────────────────
export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, price, description, stock, imageUrl, category } = req.body;

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
  if (!vendor) throw new AppError(404, 'Vendor profile not found');
  if (price !== undefined && price < 0) throw new AppError(400, 'Product price cannot be negative');

  const product = await prisma.product.create({
    data: { name, price, description, stock, imageUrl, category, vendorId: vendor.id },
  });

  res.status(201).json(product);
});

// ─── GET /api/products/vendor  (vendor only) ──────────────────────────────────
export const getVendorProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
  if (!vendor) throw new AppError(404, 'Vendor profile not found');

  const products = await prisma.product.findMany({
    where:   { vendorId: vendor.id, isDeleted: false },
    orderBy: { createdAt: 'desc' },
  });

  res.json(products);
});

// ─── PUT /api/products/:id  (vendor only) ─────────────────────────────────────
export const updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const productId = Number(req.params.id);
  const { name, price, description, stock, imageUrl, category, isAvailable } = req.body;

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
  if (!vendor) throw new AppError(404, 'Vendor profile not found');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product)                    throw new AppError(404, 'Product not found');
  if (product.vendorId !== vendor.id) throw new AppError(403, 'Not authorized to update this product');
  if (price !== undefined && price < 0) throw new AppError(400, 'Product price cannot be negative');

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(name        !== undefined && { name }),
      ...(price       !== undefined && { price }),
      ...(description !== undefined && { description }),
      ...(stock       !== undefined && { stock }),
      ...(imageUrl    !== undefined && { imageUrl }),
      ...(category    !== undefined && { category }),
      ...(isAvailable !== undefined && { isAvailable }),
    },
  });

  res.json(updated);
});

// ─── DELETE /api/products/:id  (vendor only) ──────────────────────────────────
export const deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const productId = Number(req.params.id);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
  if (!vendor) throw new AppError(404, 'Vendor profile not found');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.isDeleted) throw new AppError(404, 'Product not found');
  if (product.vendorId !== vendor.id) throw new AppError(403, 'Not authorized to delete this product');

  await prisma.product.update({ where: { id: productId }, data: { isDeleted: true } });
  res.json({ message: 'Product deleted successfully' });
});

// ─── GET /api/products  (public) ──────────────────────────────────────────────
// Supports: ?search=, ?minPrice=, ?maxPrice=, ?category=, ?vendorId=, ?page=, ?limit=
export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const rawSearch = (req.query.search as string) || '';
  const category  = req.query.category as string | undefined;
  const vendorId  = req.query.vendorId ? Number(req.query.vendorId) : undefined;
  let minPrice    = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  let maxPrice    = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
  const page      = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit     = Math.min(50, parseInt(req.query.limit as string) || 10);

  // Extract price intents from natural language ("under 100", "above 50")
  const intents = SearchEngine.extractIntents(rawSearch);
  if (intents.maxPrice) maxPrice = intents.maxPrice;
  if (intents.minPrice) minPrice = intents.minPrice;

  const whereClause: any = {
    isAvailable: true,
    isDeleted: false,
    vendor: { isOpen: true },
    ...(category && { category: { equals: category, mode: 'insensitive' } }),
    ...(vendorId && { vendorId }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  };

  const products = await prisma.product.findMany({
    where:   whereClause,
    include: { vendor: { select: { id: true, shopName: true, shopType: true, isOpen: true } } },
  });

  let processedData: any[] = products;

  if (rawSearch.trim()) {
    const tokens         = SearchEngine.tokenize(rawSearch);
    const expandedTokens = SearchEngine.expandQuery(tokens);

    processedData = products
      .map((p) => ({ ...p, score: SearchEngine.scoreProduct(p, expandedTokens, rawSearch) }))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);
  } else {
    processedData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const skip       = (page - 1) * limit;
  const totalItems = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const paged      = processedData.slice(skip, skip + limit).map(({ score: _s, ...rest }) => rest);

  res.json({
    data: paged,
    pagination: { currentPage: page, totalPages, totalItems, pageSize: limit },
  });
});

// ─── GET /api/products/categories  (public) ───────────────────────────────────
// Returns the distinct list of categories that have at least one available product
export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const result = await prisma.product.findMany({
    where:   { isAvailable: true, isDeleted: false, category: { not: null } },
    select:  { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  res.json(result.map((r) => r.category).filter(Boolean));
});

// ─── GET /api/products/:id  (public) ──────────────────────────────────────────
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  if (isNaN(productId)) throw new AppError(400, 'Invalid product ID');

  const product = await prisma.product.findUnique({
    where:   { id: productId },
    include: {
      vendor:  { select: { id: true, shopName: true, shopType: true, isOpen: true, openingTime: true, closingTime: true, averageRating: true } },
      reviews: {
        include: { user: { select: { name: true, profileImageUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take:    10,
      },
    },
  });

  if (!product || product.isDeleted) throw new AppError(404, 'Product not found');

  res.json(product);
});
