"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
const verifyToken = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new AppError_1.AppError('You are not logged in! Please log in to get access.', 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const currentUser = await db_1.default.user.findUnique({ where: { id: decoded.id } });
        if (!currentUser) {
            return next(new AppError_1.AppError('The user belonging to this token does no longer exist.', 401));
        }
        if (currentUser.status === 'banned') {
            return next(new AppError_1.AppError('Your account has been banned. Please contact admin.', 401));
        }
        req.user = currentUser;
        next();
    }
    catch (error) {
        next(new AppError_1.AppError('Invalid token or signature', 401));
    }
};
exports.verifyToken = verifyToken;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError_1.AppError('You do not have permission to perform this action', 403));
        }
        let userRole = req.user.role.toLowerCase();
        if (userRole === 'rider')
            userRole = 'courier';
        if (userRole === 'customer')
            userRole = 'user';
        if (!roles.includes(userRole)) {
            return next(new AppError_1.AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=authMiddleware.js.map