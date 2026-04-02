"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.resetPassword = exports.verifyOtp = exports.forgotPassword = exports.login = exports.register = void 0;
const authService_1 = require("../services/authService");
const notificationService_1 = require("../services/notificationService");
const AppError_1 = require("../utils/AppError");
const db_1 = __importDefault(require("../config/db"));
const helpers_1 = require("../utils/helpers");
const register = async (req, res, next) => {
    try {
        const { name, email, password, role, phone, address } = req.body;
        let dbRole = 'user';
        if (role === 'CUSTOMER' || role === 'user')
            dbRole = 'user';
        else if (role === 'VENDOR' || role === 'vendor')
            dbRole = 'vendor';
        else if (role === 'RIDER' || role === 'courier')
            dbRole = 'courier';
        else if (role === 'ADMIN' || role === 'admin') {
            return next(new AppError_1.AppError('Forbidden: System operates with exactly ONE master admin. Registration blocked.', 403));
        }
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser)
            return next(new AppError_1.AppError('Email already registered', 400));
        const passwordHash = await authService_1.authService.hashPassword(password);
        // Begin Transaction
        const user = await db_1.default.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: { name, email, passwordHash, role: dbRole, phone, address }
            });
            if (dbRole === 'vendor') {
                await tx.vendor.create({
                    data: { userId: newUser.id, name: `${name}'s Shop`, email }
                });
            }
            if (dbRole === 'courier') {
                await tx.courierProfile.create({
                    data: { userId: newUser.id }
                });
            }
            return newUser;
        });
        const accessToken = authService_1.authService.generateAccessToken(user.id, user.role);
        const refreshToken = authService_1.authService.generateRefreshToken(user.id);
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { user: (0, helpers_1.sanitizeUser)(user), accessToken, refreshToken }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user || user.status === 'banned') {
            return next(new AppError_1.AppError('Invalid email or password', 401));
        }
        if (user.role === 'vendor' || user.role === 'VENDOR') {
            const vendor = await db_1.default.vendor.findUnique({ where: { userId: user.id } });
            if (vendor && vendor.status === 'suspended') {
                return next(new AppError_1.AppError('Your vendor account has been suspended. Please contact the master admin.', 403));
            }
        }
        const isMatch = await authService_1.authService.comparePassword(password, user.passwordHash);
        if (!isMatch)
            return next(new AppError_1.AppError('Invalid email or password', 401));
        const accessToken = authService_1.authService.generateAccessToken(user.id, user.role);
        const refreshToken = authService_1.authService.generateRefreshToken(user.id);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user: (0, helpers_1.sanitizeUser)(user), accessToken, refreshToken }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const forgotPassword = async (req, res, next) => {
    try {
        const { identifier } = req.body;
        const user = await db_1.default.user.findFirst({
            where: { OR: [{ email: identifier }, { phone: identifier }] }
        });
        if (!user)
            return next(new AppError_1.AppError('User not found', 404));
        const otp = authService_1.authService.generateOTP();
        const token = await authService_1.authService.hashOTP(otp);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        await db_1.default.passwordResetToken.create({
            data: { userId: user.id, token, expiresAt }
        });
        await notificationService_1.notificationService.sendOTPEmail(user.email, otp);
        const devResponse = process.env.NODE_ENV === 'development' ? { otp } : {};
        res.status(200).json({
            success: true,
            message: 'OTP sent',
            data: { userId: user.id, ...devResponse }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
const verifyOtp = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;
        const tokens = await db_1.default.passwordResetToken.findMany({
            where: { userId, used: false, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' }
        });
        if (tokens.length === 0)
            return next(new AppError_1.AppError('Invalid or expired OTP', 400));
        let validToken = null;
        for (const t of tokens) {
            if (await authService_1.authService.comparePassword(otp, t.token)) {
                validToken = t;
                break;
            }
        }
        if (!validToken)
            return next(new AppError_1.AppError('Invalid OTP', 400));
        await db_1.default.passwordResetToken.update({
            where: { id: validToken.id },
            data: { used: true }
        });
        res.status(200).json({
            success: true,
            data: { verified: true, resetToken: validToken.token }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyOtp = verifyOtp;
const resetPassword = async (req, res, next) => {
    try {
        const { userId, resetToken, newPassword } = req.body;
        const tokenRecord = await db_1.default.passwordResetToken.findFirst({
            where: { userId, token: resetToken, used: true }
        });
        if (!tokenRecord)
            return next(new AppError_1.AppError('Invalid reset attempt', 400));
        const passwordHash = await authService_1.authService.hashPassword(newPassword);
        await db_1.default.user.update({
            where: { id: userId },
            data: { passwordHash }
        });
        await db_1.default.passwordResetToken.deleteMany({ where: { userId } });
        res.status(200).json({ success: true, message: 'Password reset successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
const getMe = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: (0, helpers_1.sanitizeUser)(req.user)
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
//# sourceMappingURL=authController.js.map