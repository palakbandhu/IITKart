"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceipt = exports.getPaymentHistory = exports.verifyPayment = exports.createRazorpayOrder = void 0;
const paymentService_1 = require("../services/paymentService");
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
const createRazorpayOrder = async (req, res, next) => {
    try {
        const { amount, currency, orderId } = req.body;
        // Check if order belongs to user
        const dbOrder = await db_1.default.order.findUnique({ where: { id: orderId } });
        if (!dbOrder || dbOrder.userId !== req.user.id) {
            return next(new AppError_1.AppError('Invalid order', 400));
        }
        const order = await paymentService_1.paymentService.createRazorpayOrder(amount, currency);
        res.status(200).json({
            success: true,
            data: {
                razorpayOrderId: order.id,
                amount,
                currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
const verifyPayment = async (req, res, next) => {
    try {
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId, method } = req.body;
        const isValid = paymentService_1.paymentService.verifyRazorpaySignature(razorpayPaymentId, razorpayOrderId, razorpaySignature);
        if (!isValid)
            return next(new AppError_1.AppError('Invalid signature', 400));
        await db_1.default.payment.updateMany({
            where: { orderId },
            data: {
                paymentStatus: 'success',
                razorpayPaymentId,
                razorpayOrderId,
                razorpaySignature,
                method
            }
        });
        await db_1.default.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'success' }
        });
        res.status(200).json({ success: true, message: 'Payment verified' });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPayment = verifyPayment;
const getPaymentHistory = async (req, res, next) => {
    try {
        const payments = await db_1.default.payment.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: payments });
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentHistory = getPaymentHistory;
const getReceipt = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await db_1.default.order.findUnique({
            where: { id: orderId },
            include: { payment: true }
        });
        if (!order)
            return next(new AppError_1.AppError('Order not found', 404));
        const receipt = paymentService_1.paymentService.generateReceipt(order);
        res.status(200).json({ success: true, data: { receipt } });
    }
    catch (error) {
        next(error);
    }
};
exports.getReceipt = getReceipt;
//# sourceMappingURL=paymentController.js.map