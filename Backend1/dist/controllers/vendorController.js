"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDeliveryIssueStatus = exports.getVendorDeliveryIssues = exports.updateCourierJob = exports.createCourierJob = exports.getVendorAnalytics = exports.getVendorReviews = exports.acceptOrder = exports.getVendorOrders = exports.deleteProduct = exports.updateProduct = exports.addProduct = exports.getVendorProducts = exports.updateVendorProfile = exports.getVendorProfile = exports.getVendorById = exports.getAllProducts = exports.getVendors = void 0;
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
const getVendors = async (req, res, next) => {
    try {
        const vendors = await db_1.default.vendor.findMany({
            where: { status: 'active' },
            select: { id: true, userId: true, name: true, location: true, availability: true, rating: true, status: true, totalOrders: true, totalEarnings: true, products: true }
        });
        res.status(200).json({ success: true, data: vendors });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendors = getVendors;
const getAllProducts = async (req, res, next) => {
    try {
        const products = await db_1.default.product.findMany({
            where: { inStock: true },
            include: { vendor: { select: { name: true } } }
        });
        res.status(200).json({ success: true, data: products });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllProducts = getAllProducts;
const getVendorById = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({
            where: { id: req.params.id },
            include: { products: { where: { inStock: true } } }
        });
        if (!vendor)
            return next(new AppError_1.AppError('Vendor not found', 404));
        res.status(200).json({ success: true, data: vendor });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorById = getVendorById;
const getVendorProfile = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor)
            return next(new AppError_1.AppError('Vendor profile not found', 404));
        res.status(200).json({ success: true, data: vendor });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorProfile = getVendorProfile;
const updateVendorProfile = async (req, res, next) => {
    try {
        const { availability, riderRequirements, needsRider, location, name } = req.body;
        const vendor = await db_1.default.vendor.update({
            where: { userId: req.user.id },
            data: { availability, riderRequirements, needsRider, location, name }
        });
        res.status(200).json({ success: true, data: vendor });
    }
    catch (error) {
        next(error);
    }
};
exports.updateVendorProfile = updateVendorProfile;
const getVendorProducts = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const products = await db_1.default.product.findMany({ where: { vendorId: vendor.id } });
        res.status(200).json({ success: true, data: products });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorProducts = getVendorProducts;
const addProduct = async (req, res, next) => {
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
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        // Loosen category validation to allow frontend categories
        const validCategories = ['Food', 'Beverage', 'Beverages', 'Printing', 'Laundry', 'Stationery', 'Snacks', 'Services', 'Other'];
        if (!validCategories.includes(category)) {
            return next(new AppError_1.AppError('Invalid category', 400));
        }
        const product = await db_1.default.product.create({
            data: { name, category, price, description, image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', inStock, vendorId: vendor.id }
        });
        res.status(201).json({ success: true, data: product });
    }
    catch (error) {
        next(error);
    }
};
exports.addProduct = addProduct;
const updateProduct = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const product = await db_1.default.product.findFirst({ where: { id: req.params.id, vendorId: vendor.id } });
        if (!product)
            return next(new AppError_1.AppError('Product not found or unauthorized', 404));
        const updateData = { ...req.body };
        if (req.body.price !== undefined)
            updateData.price = Number(req.body.price);
        if (req.body.inStock !== undefined)
            updateData.inStock = req.body.inStock === 'true' || req.body.inStock === true;
        if (updateData.image && typeof updateData.image === 'object') {
            delete updateData.image;
        }
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }
        const updated = await db_1.default.product.update({
            where: { id: product.id },
            data: updateData
        });
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        await db_1.default.product.deleteMany({ where: { id: req.params.id, vendorId: vendor.id } });
        res.status(200).json({ success: true, message: 'Product deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
const getVendorOrders = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const orders = await db_1.default.order.findMany({
            where: { vendorId: vendor.id },
            orderBy: { createdAt: 'desc' },
            include: {
                items: { include: { product: true } },
                user: { select: { name: true, phone: true } },
                courier: { select: { name: true, phone: true } }
            }
        });
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorOrders = getVendorOrders;
const acceptOrder = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const order = await db_1.default.order.findFirst({ where: { id: req.params.orderId, vendorId: vendor.id, status: 'pending' } });
        if (!order)
            return next(new AppError_1.AppError('Order not found or not pending', 404));
        const updated = await db_1.default.order.update({
            where: { id: order.id },
            data: { status: 'accepted' }
        });
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
};
exports.acceptOrder = acceptOrder;
const getVendorReviews = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const orders = await db_1.default.order.findMany({
            where: { vendorId: vendor.id, vendorRating: { not: null } },
            select: { id: true, vendorRating: true, vendorFeedback: true, user: { select: { name: true } } }
        });
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorReviews = getVendorReviews;
const getVendorAnalytics = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const activeOrderCount = await db_1.default.order.count({ where: { vendorId: vendor.id, status: { in: ['pending', 'accepted', 'picked'] } } });
        const completedOrderCount = await db_1.default.order.count({ where: { vendorId: vendor.id, status: 'delivered' } });
        // Top products aggregation could be complex, keeping simple return for now
        res.status(200).json({
            success: true,
            data: {
                totalOrders: vendor.totalOrders,
                totalEarnings: vendor.totalEarnings,
                activeOrderCount,
                completedOrderCount,
                avgRating: vendor.rating,
                topProducts: [], // Placeholder
                revenueByDay: [] // Placeholder
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorAnalytics = getVendorAnalytics;
const createCourierJob = async (req, res, next) => {
    try {
        const { requirements, salary } = req.body;
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const job = await db_1.default.courierJob.create({
            data: { requirements, salary, vendorId: vendor.id }
        });
        res.status(201).json({ success: true, data: job });
    }
    catch (error) {
        next(error);
    }
};
exports.createCourierJob = createCourierJob;
const updateCourierJob = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        const job = await db_1.default.courierJob.updateMany({
            where: { id: req.params.jobId, vendorId: vendor.id },
            data: req.body
        });
        res.status(200).json({ success: true, data: job });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCourierJob = updateCourierJob;
const getVendorDeliveryIssues = async (req, res, next) => {
    try {
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor)
            return next(new AppError_1.AppError('Vendor not found', 404));
        const issues = await db_1.default.deliveryIssue.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorDeliveryIssues = getVendorDeliveryIssues;
const updateDeliveryIssueStatus = async (req, res, next) => {
    try {
        const { status, resolutionNotes } = req.body;
        const { issueId } = req.params;
        const vendor = await db_1.default.vendor.findUnique({ where: { userId: req.user.id } });
        if (!vendor)
            return next(new AppError_1.AppError('Vendor not found', 404));
        const existingIssue = await db_1.default.deliveryIssue.findFirst({
            where: {
                id: issueId,
                order: { vendorId: vendor.id }
            }
        });
        if (!existingIssue) {
            return next(new AppError_1.AppError('Delivery issue not found or unauthorized', 404));
        }
        const updatedIssue = await db_1.default.deliveryIssue.update({
            where: { id: issueId },
            data: { status, resolutionNotes }
        });
        res.status(200).json({ success: true, data: updatedIssue, message: 'Delivery issue status updated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateDeliveryIssueStatus = updateDeliveryIssueStatus;
//# sourceMappingURL=vendorController.js.map