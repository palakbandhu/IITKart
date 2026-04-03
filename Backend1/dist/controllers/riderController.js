"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedbacks = exports.getCourierJobs = exports.reportIssue = exports.getEarnings = exports.getDeliveryHistory = exports.getActiveDeliveries = exports.markDelivered = exports.rejectDelivery = exports.acceptDelivery = exports.getPendingDeliveries = exports.updateProfile = exports.getProfile = void 0;
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
function calculateDeliveryEarnings(orderTotal) {
    return Math.floor(orderTotal * 0.15) + 20;
}
const getProfile = async (req, res, next) => {
    try {
        const profile = await db_1.default.courierProfile.upsert({
            where: { userId: req.user.id },
            create: { userId: req.user.id },
            update: {}
        });
        const reviews = await db_1.default.order.findMany({
            where: { courierId: req.user.id, courierRating: { not: null } },
            select: { id: true, courierRating: true, courierFeedback: true, user: { select: { name: true } }, createdAt: true }
        });
        res.status(200).json({ success: true, data: { ...profile, reviews } });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    try {
        const { experience, availability, lookingForJob } = req.body;
        const profile = await db_1.default.courierProfile.upsert({
            where: { userId: req.user.id },
            create: { userId: req.user.id, experience, availability, lookingForJob },
            update: { experience, availability, lookingForJob }
        });
        res.status(200).json({ success: true, data: profile });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const getPendingDeliveries = async (req, res, next) => {
    try {
        const orders = await db_1.default.order.findMany({
            where: { status: { in: ['pending', 'accepted'] }, courierId: null },
            include: { vendor: { select: { name: true, location: true } } },
            orderBy: { createdAt: 'desc' }
        });
        const formatted = orders.map(o => ({
            ...o,
            estimatedEarnings: calculateDeliveryEarnings(o.total)
        }));
        res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        next(error);
    }
};
exports.getPendingDeliveries = getPendingDeliveries;
const acceptDelivery = async (req, res, next) => {
    try {
        // Atomic update preventing race conditions
        const updateResult = await db_1.default.order.updateMany({
            where: { id: req.params.orderId, status: { in: ['pending', 'accepted'] }, courierId: null },
            data: { courierId: req.user.id, status: 'picked' }
        });
        if (updateResult.count === 0) {
            return next(new AppError_1.AppError('Delivery is no longer available', 400));
        }
        const order = await db_1.default.order.findUnique({ where: { id: req.params.orderId } });
        res.status(200).json({ success: true, data: order, message: 'Delivery accepted' });
    }
    catch (error) {
        next(error);
    }
};
exports.acceptDelivery = acceptDelivery;
const rejectDelivery = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Delivery rejected' });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectDelivery = rejectDelivery;
const markDelivered = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const result = await db_1.default.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId, courierId: req.user.id, status: 'picked' }
            });
            if (!order)
                throw new AppError_1.AppError('Invalid order state or unauthorized', 400);
            const earnings = calculateDeliveryEarnings(order.total);
            const updated = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'delivered',
                    paymentStatus: order.paymentMethod === 'Cash on Delivery' ? 'success' : order.paymentStatus
                }
            });
            await tx.courierProfile.upsert({
                where: { userId: req.user.id },
                create: { userId: req.user.id, totalDeliveries: 1, totalEarnings: earnings },
                update: { totalDeliveries: { increment: 1 }, totalEarnings: { increment: earnings } }
            });
            await tx.vendor.update({
                where: { id: order.vendorId },
                data: { totalOrders: { increment: 1 }, totalEarnings: { increment: order.total } }
            });
            return updated;
        });
        res.status(200).json({ success: true, data: result, message: 'Order delivered successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.markDelivered = markDelivered;
const getActiveDeliveries = async (req, res, next) => {
    try {
        const orders = await db_1.default.order.findMany({
            where: { courierId: req.user.id, status: 'picked' },
            include: { vendor: { select: { name: true, location: true } }, user: { select: { name: true, phone: true } } },
            orderBy: { updatedAt: 'desc' }
        });
        const formatted = orders.map(o => ({
            ...o,
            estimatedEarnings: calculateDeliveryEarnings(o.total)
        }));
        res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveDeliveries = getActiveDeliveries;
const getDeliveryHistory = async (req, res, next) => {
    try {
        const orders = await db_1.default.order.findMany({
            where: { courierId: req.user.id, status: 'delivered' },
            orderBy: { updatedAt: 'desc' }
        });
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        next(error);
    }
};
exports.getDeliveryHistory = getDeliveryHistory;
const getEarnings = async (req, res, next) => {
    try {
        const profile = await db_1.default.courierProfile.findUnique({ where: { userId: req.user.id } });
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const day = now.getDay() || 7;
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        const completedDeliveries = await db_1.default.order.findMany({
            where: { courierId: req.user.id, status: 'delivered' },
            select: { id: true, vendor: { select: { location: true } }, deliveryAddress: true, total: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' }
        });
        let todayEarnings = 0;
        let weekEarnings = 0;
        const formattedDeliveries = completedDeliveries.map(d => {
            const e = calculateDeliveryEarnings(d.total);
            if (d.updatedAt >= startOfToday)
                todayEarnings += e;
            if (d.updatedAt >= startOfWeek)
                weekEarnings += e;
            return {
                orderId: d.id,
                from: d.vendor?.location || 'Unknown',
                to: d.deliveryAddress,
                earnings: e,
                date: d.updatedAt
            };
        });
        res.status(200).json({
            success: true,
            data: {
                totalEarnings: profile?.totalEarnings || 0,
                todayEarnings,
                weekEarnings,
                totalDeliveries: profile?.totalDeliveries || 0,
                completedDeliveries: formattedDeliveries
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEarnings = getEarnings;
const reportIssue = async (req, res, next) => {
    try {
        const { orderId, issueType, description } = req.body;
        const issue = await db_1.default.deliveryIssue.create({
            data: { orderId, courierId: req.user.id, issueType, description }
        });
        res.status(201).json({ success: true, data: issue });
    }
    catch (error) {
        next(error);
    }
};
exports.reportIssue = reportIssue;
const getCourierJobs = async (req, res, next) => {
    try {
        const jobs = await db_1.default.courierJob.findMany({
            where: { isAvailable: true },
            include: { vendor: { select: { name: true, location: true } } }
        });
        res.status(200).json({ success: true, data: jobs });
    }
    catch (error) {
        next(error);
    }
};
exports.getCourierJobs = getCourierJobs;
const getFeedbacks = async (req, res, next) => {
    try {
        const feedbacks = await db_1.default.order.findMany({
            where: {
                courierId: req.user.id,
                courierRating: { not: null }
            },
            select: {
                id: true,
                courierRating: true,
                courierFeedback: true,
                updatedAt: true,
                user: { select: { name: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        const avgRating = feedbacks.length > 0
            ? (feedbacks.reduce((acc, curr) => acc + (curr.courierRating || 0), 0) / feedbacks.length).toFixed(1)
            : "5.0";
        res.status(200).json({
            success: true,
            data: {
                feedbacks,
                avgRating
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFeedbacks = getFeedbacks;
//# sourceMappingURL=riderController.js.map