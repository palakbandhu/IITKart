"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportOrdersCSV = exports.exportVendorsCSV = exports.exportUsersCSV = exports.updateDeliveryIssue = exports.getDeliveryIssues = exports.resolveComplaint = exports.getComplaints = exports.forceUpdateOrderStatus = exports.getOrders = exports.toggleVendorStatus = exports.listVendors = exports.banUser = exports.listUsers = exports.getPlatformStats = void 0;
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
const json2csv_1 = require("json2csv");
const client_1 = require("@prisma/client");
const getPlatformStats = async (req, res, next) => {
    try {
        const totalOrders = await db_1.default.order.count();
        const revenueAggr = await db_1.default.order.aggregate({
            _sum: { total: true },
            where: { status: { in: ['delivered', 'accepted'] } }
        });
        const activeUsers = await db_1.default.user.count({ where: { status: 'active', role: 'user' } });
        const activeVendors = await db_1.default.vendor.count({ where: { status: 'active' } });
        const pendingComplaints = await db_1.default.complaint.count({ where: { status: 'pending' } });
        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: revenueAggr._sum.total || 0,
                activeUsers,
                activeVendors,
                pendingComplaints
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPlatformStats = getPlatformStats;
const listUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const where = {
            role: 'user',
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            } : {})
        };
        const [users, total] = await Promise.all([
            db_1.default.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
            }),
            db_1.default.user.count({ where })
        ]);
        res.status(200).json({ success: true, data: users, meta: { total, page, limit } });
    }
    catch (error) {
        next(error);
    }
};
exports.listUsers = listUsers;
const banUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await db_1.default.user.findUnique({ where: { id } });
        if (!user)
            return next(new AppError_1.AppError('User not found', 404));
        if (user.role === 'admin')
            return next(new AppError_1.AppError('Cannot alter admin status', 400));
        const newStatus = user.status === 'banned' ? 'active' : 'banned';
        const updated = await db_1.default.user.update({
            where: { id },
            data: { status: newStatus },
            select: { id: true, name: true, email: true, status: true }
        });
        res.status(200).json({ success: true, message: `User status changed to ${newStatus}`, data: updated });
    }
    catch (error) {
        next(error);
    }
};
exports.banUser = banUser;
const listVendors = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ]
        } : {};
        const [vendors, total] = await Promise.all([
            db_1.default.vendor.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { status: true } } }
            }),
            db_1.default.vendor.count({ where })
        ]);
        res.status(200).json({ success: true, data: vendors, meta: { total, page, limit } });
    }
    catch (error) {
        next(error);
    }
};
exports.listVendors = listVendors;
const toggleVendorStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const vendor = await db_1.default.vendor.findUnique({ where: { id } });
        if (!vendor)
            return next(new AppError_1.AppError('Vendor not found', 404));
        const newStatus = vendor.status === 'suspended' ? 'active' : 'suspended';
        const updated = await db_1.default.vendor.update({
            where: { id },
            data: { status: newStatus }
        });
        res.status(200).json({ success: true, message: `Vendor status changed to ${newStatus}`, data: updated });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleVendorStatus = toggleVendorStatus;
const getOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const [orders, total] = await Promise.all([
            db_1.default.order.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true, email: true } }, vendor: { select: { name: true } } }
            }),
            db_1.default.order.count()
        ]);
        res.status(200).json({ success: true, data: orders, meta: { total, page, limit } });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrders = getOrders;
const forceUpdateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!Object.values(client_1.OrderStatus).includes(status)) {
            return next(new AppError_1.AppError('Invalid order status provided', 400));
        }
        const updated = await db_1.default.order.update({
            where: { id },
            data: { status }
        });
        res.status(200).json({ success: true, message: `Order status forcefully updated to ${status}`, data: updated });
    }
    catch (error) {
        next(error);
    }
};
exports.forceUpdateOrderStatus = forceUpdateOrderStatus;
const getComplaints = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const [complaints, total] = await Promise.all([
            db_1.default.complaint.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true, email: true } } }
            }),
            db_1.default.complaint.count()
        ]);
        res.status(200).json({ success: true, data: complaints, meta: { total, page, limit } });
    }
    catch (error) {
        next(error);
    }
};
exports.getComplaints = getComplaints;
const resolveComplaint = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!Object.values(client_1.ComplaintStatus).includes(status)) {
            return next(new AppError_1.AppError('Invalid complaint status', 400));
        }
        const updated = await db_1.default.complaint.update({
            where: { id },
            data: { status }
        });
        res.status(200).json({ success: true, message: `Complaint marked as ${status}`, data: updated });
    }
    catch (error) {
        next(error);
    }
};
exports.resolveComplaint = resolveComplaint;
const getDeliveryIssues = async (req, res, next) => {
    res.status(501).json({ success: false, message: 'Not implemented' });
};
exports.getDeliveryIssues = getDeliveryIssues;
const updateDeliveryIssue = async (req, res, next) => {
    res.status(501).json({ success: false, message: 'Not implemented' });
};
exports.updateDeliveryIssue = updateDeliveryIssue;
// Data Exports
const exportUsersCSV = async (req, res, next) => {
    try {
        const users = await db_1.default.user.findMany({
            select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
        });
        const fields = ['id', 'name', 'email', 'role', 'status', 'createdAt'];
        const csv = (0, json2csv_1.parse)(users, { fields });
        res.header('Content-Type', 'text/csv');
        res.attachment('iitkart-users-export.csv');
        return res.status(200).send(csv);
    }
    catch (error) {
        next(error);
    }
};
exports.exportUsersCSV = exportUsersCSV;
const exportVendorsCSV = async (req, res, next) => {
    try {
        const vendors = await db_1.default.vendor.findMany({
            select: { id: true, name: true, email: true, status: true, totalOrders: true, totalEarnings: true, rating: true, createdAt: true }
        });
        const fields = ['id', 'name', 'email', 'status', 'totalOrders', 'totalEarnings', 'rating', 'createdAt'];
        const csv = (0, json2csv_1.parse)(vendors, { fields });
        res.header('Content-Type', 'text/csv');
        res.attachment('iitkart-vendors-export.csv');
        return res.status(200).send(csv);
    }
    catch (error) {
        next(error);
    }
};
exports.exportVendorsCSV = exportVendorsCSV;
const exportOrdersCSV = async (req, res, next) => {
    try {
        const orders = await db_1.default.order.findMany({
            select: { id: true, userId: true, vendorId: true, total: true, status: true, paymentMethod: true, kartCoinsEarned: true, createdAt: true }
        });
        const fields = ['id', 'userId', 'vendorId', 'total', 'status', 'paymentMethod', 'kartCoinsEarned', 'createdAt'];
        const csv = (0, json2csv_1.parse)(orders, { fields });
        res.header('Content-Type', 'text/csv');
        res.attachment('iitkart-orders-export.csv');
        return res.status(200).send(csv);
    }
    catch (error) {
        next(error);
    }
};
exports.exportOrdersCSV = exportOrdersCSV;
//# sourceMappingURL=adminController.js.map