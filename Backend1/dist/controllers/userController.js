"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserComplaints = exports.getUserOrders = exports.getWallet = exports.toggleFavorite = exports.getFavorites = exports.verifyEmailChange = exports.requestEmailUpdate = exports.updateProfile = exports.getProfile = void 0;
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
const helpers_1 = require("../utils/helpers");
const getProfile = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: (0, helpers_1.sanitizeUser)(req.user) });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, address } = req.body;
        let photo = req.user.photo;
        if (req.file) {
            photo = `/uploads/${req.file.filename}`;
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: req.user.id },
            data: { name, phone, address, photo }
        });
        res.status(200).json({ success: true, data: (0, helpers_1.sanitizeUser)(updatedUser) });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const requestEmailUpdate = async (req, res, next) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail)
            return next(new AppError_1.AppError('New email is required', 400));
        // Check if email already in use
        const existing = await db_1.default.user.findUnique({ where: { email: newEmail } });
        if (existing)
            return next(new AppError_1.AppError('Email already registered', 400));
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await db_1.default.user.update({
            where: { id: req.user.id },
            data: { pendingEmail: newEmail, otp, otpExpiry }
        });
        // We can use the existing notificationService to send this OTP
        const { notificationService } = require('../services/notificationService');
        await notificationService.sendOTPEmail(newEmail, otp);
        res.status(200).json({ success: true, message: 'OTP sent to new email' });
    }
    catch (error) {
        next(error);
    }
};
exports.requestEmailUpdate = requestEmailUpdate;
const verifyEmailChange = async (req, res, next) => {
    try {
        const { otp } = req.body;
        if (!otp)
            return next(new AppError_1.AppError('OTP is required', 400));
        const user = await db_1.default.user.findUnique({ where: { id: req.user.id } });
        if (!user || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            return next(new AppError_1.AppError('Invalid or expired OTP', 400));
        }
        if (!user.pendingEmail) {
            return next(new AppError_1.AppError('No pending email update found', 400));
        }
        // Update the email and clear pending
        await db_1.default.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: user.id },
                data: {
                    email: user.pendingEmail,
                    pendingEmail: null,
                    otp: null,
                    otpExpiry: null,
                    isVerified: true
                }
            });
            if (user.role === 'vendor') {
                await tx.vendor.update({
                    where: { userId: user.id },
                    data: { email: user.pendingEmail }
                });
            }
        });
        res.status(200).json({ success: true, message: 'Email updated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyEmailChange = verifyEmailChange;
const getFavorites = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: req.user.favorites });
    }
    catch (error) {
        next(error);
    }
};
exports.getFavorites = getFavorites;
const toggleFavorite = async (req, res, next) => {
    try {
        const { productId } = req.params;
        let favorites = req.user.favorites || [];
        let added = false;
        if (favorites.includes(productId)) {
            favorites = favorites.filter((id) => id !== productId);
        }
        else {
            favorites.push(productId);
            added = true;
        }
        await db_1.default.user.update({
            where: { id: req.user.id },
            data: { favorites }
        });
        res.status(200).json({ success: true, data: { favorites, added } });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleFavorite = toggleFavorite;
const getWallet = async (req, res, next) => {
    try {
        const transactions = await db_1.default.order.findMany({
            where: { userId: req.user.id, kartCoinsEarned: { gt: 0 } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, total: true, kartCoinsEarned: true, createdAt: true, vendor: { select: { name: true } } }
        });
        res.status(200).json({
            success: true,
            data: { kartCoins: req.user.kartCoins, transactions }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getWallet = getWallet;
const getUserOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const { skip, take } = (0, helpers_1.paginateQuery)(page, limit);
        const where = { userId: req.user.id, ...(status ? { status } : {}) };
        const [orders, total] = await Promise.all([
            db_1.default.order.findMany({
                where, skip, take,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { product: true } },
                    vendor: { select: { name: true, user: { select: { phone: true } } } },
                    courier: { select: { name: true, phone: true } }
                }
            }),
            db_1.default.order.count({ where })
        ]);
        res.status(200).json({
            success: true,
            data: orders,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserOrders = getUserOrders;
const getUserComplaints = async (req, res, next) => {
    try {
        const complaints = await db_1.default.complaint.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: complaints });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserComplaints = getUserComplaints;
//# sourceMappingURL=userController.js.map