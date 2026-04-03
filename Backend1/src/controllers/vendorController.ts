import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getVendors = async (req: any, res: Response, next: NextFunction) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { status: 'active' },
      select: { id: true, userId: true, name: true, location: true, availability: true, rating: true, status: true, totalOrders: true, totalEarnings: true, products: true }
    });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) { next(error); }
};

export const getAllProducts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { inStock: true },
      include: { vendor: { select: { name: true } } }
    });
    res.status(200).json({ success: true, data: products });
  } catch (error) { next(error); }
};

export const getVendorById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: { products: { where: { inStock: true } } }
    });
    if (!vendor) return next(new AppError('Vendor not found', 404));
    res.status(200).json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

export const getVendorProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (!vendor) return next(new AppError('Vendor profile not found', 404));
    res.status(200).json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

export const updateVendorProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { availability, riderRequirements, needsRider, location, name } = req.body;
    const vendor = await prisma.vendor.update({
      where: { userId: req.user.id },
      data: { availability, riderRequirements, needsRider, location, name }
    });
    res.status(200).json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

export const getVendorProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const products = await prisma.product.findMany({ where: { vendorId: vendor!.id } });
    res.status(200).json({ success: true, data: products });
  } catch (error) { next(error); }
};

export const addProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, category, description } = req.body;
    let price = req.body.price ? Number(req.body.price) : 0;
    let inStock = req.body.inStock === 'true' || req.body.inStock === true;
    let image = req.body.image;
    
    if (image && typeof image === 'object') {
      image = undefined;
    }
    
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }
    
    if (!image || typeof image !== 'string') {
      image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
    }

    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    
    // Loosen category validation to allow frontend categories
    const validCategories = ['Food', 'Beverage', 'Beverages', 'Printing', 'Laundry', 'Stationery', 'Snacks', 'Services', 'Other'];
    if (!validCategories.includes(category)) {
      return next(new AppError('Invalid category', 400));
    }

    const stockQuantity = req.body.stock !== undefined ? Number(req.body.stock) : (req.body.stockQuantity !== undefined ? Number(req.body.stockQuantity) : 0);
    inStock = stockQuantity > 0;

    const product = await prisma.product.create({
      data: { name, category, price, description, image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', inStock, stockQuantity, vendorId: vendor!.id }
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
};

export const updateProduct = async (req: any, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const product = await prisma.product.findFirst({ where: { id: req.params.id, vendorId: vendor!.id } });
    
    if (!product) return next(new AppError('Product not found or unauthorized', 404));

    const updateData = { ...req.body };
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.inStock !== undefined) updateData.inStock = req.body.inStock === 'true' || req.body.inStock === true;
    
    if (updateData.image && typeof updateData.image === 'object') {
      delete updateData.image;
    }
    
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    if (updateData.stock !== undefined) {
      updateData.stockQuantity = Number(updateData.stock);
      updateData.inStock = updateData.stockQuantity > 0;
      delete updateData.stock;
    } else if (updateData.stockQuantity !== undefined) {
      updateData.stockQuantity = Number(updateData.stockQuantity);
      updateData.inStock = updateData.stockQuantity > 0;
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: updateData
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    await prisma.product.deleteMany({ where: { id: req.params.id, vendorId: vendor!.id } });
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) { next(error); }
};

export const getVendorOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const orders = await prisma.order.findMany({
      where: { vendorId: vendor!.id },
      orderBy: { createdAt: 'desc' },
      include: { 
        items: { include: { product: true } }, 
        user: { select: { name: true, phone: true } },
        courier: { select: { name: true, phone: true } }
      }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};

export const acceptOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, vendorId: vendor!.id, status: 'pending' } });
    
    if (!order) return next(new AppError('Order not found or not pending', 404));

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'accepted' }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getVendorReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const orders = await prisma.order.findMany({
      where: { vendorId: vendor!.id, vendorRating: { not: null } },
      select: { id: true, vendorRating: true, vendorFeedback: true, user: { select: { name: true } } }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};

export const getVendorAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    
    const activeOrderCount = await prisma.order.count({ where: { vendorId: vendor!.id, status: { in: ['pending', 'accepted', 'picked'] } } });
    const completedOrderCount = await prisma.order.count({ where: { vendorId: vendor!.id, status: 'delivered' } });
    
    // Top products aggregation could be complex, keeping simple return for now
    res.status(200).json({
      success: true,
      data: {
        totalOrders: vendor!.totalOrders,
        totalEarnings: vendor!.totalEarnings,
        activeOrderCount,
        completedOrderCount,
        avgRating: vendor!.rating,
        topProducts: [], // Placeholder
        revenueByDay: [] // Placeholder
      }
    });
  } catch (error) { next(error); }
};

export const createCourierJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { requirements, salary } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const job = await prisma.courierJob.create({
      data: { requirements, salary, vendorId: vendor!.id }
    });
    res.status(201).json({ success: true, data: job });
  } catch (error) { next(error); }
};

export const updateCourierJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const job = await prisma.courierJob.updateMany({
      where: { id: req.params.jobId, vendorId: vendor!.id },
      data: req.body
    });
    res.status(200).json({ success: true, data: job });
  } catch (error) { next(error); }
};

export const getVendorDeliveryIssues = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (!vendor) return next(new AppError('Vendor not found', 404));

    const issues = await prisma.deliveryIssue.findMany({
      where: { order: { vendorId: vendor.id } },
      include: {
        order: {
          select: {
            id: true,
            deliveryAddress: true,
            status: true,
            courier: { select: { name: true, phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: issues });
  } catch (error) { next(error); }
};

export const updateDeliveryIssueStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, resolutionNotes } = req.body;
    const { issueId } = req.params;

    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (!vendor) return next(new AppError('Vendor not found', 404));

    const existingIssue = await prisma.deliveryIssue.findFirst({
      where: {
        id: issueId,
        order: { vendorId: vendor.id }
      }
    });

    if (!existingIssue) {
      return next(new AppError('Delivery issue not found or unauthorized', 404));
    }

    const updatedIssue = await prisma.deliveryIssue.update({
      where: { id: issueId },
      data: { status, resolutionNotes }
    });

    res.status(200).json({ success: true, data: updatedIssue, message: 'Delivery issue status updated successfully' });
  } catch (error) { next(error); }
};
