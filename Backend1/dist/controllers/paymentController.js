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
        const { amount, currency, orderId, items, vendorId, deliveryAddress, paymentMethod } = req.body;
        // If orderId is provided, validate it. Otherwise create a new order
        let dbOrder = null;
        if (orderId) {
            dbOrder = await db_1.default.order.findUnique({ where: { id: orderId } });
            if (!dbOrder || dbOrder.userId !== req.user.id) {
                return next(new AppError_1.AppError('Invalid order', 400));
            }
        }
        else if (items && vendorId && deliveryAddress) {
            // Create order if items are provided
            const productIds = items.map((i) => i.productId);
            const products = await db_1.default.product.findMany({ where: { id: { in: productIds } } });
            if (!products.length) {
                return next(new AppError_1.AppError('Products not found', 404));
            }
            let total = 0;
            const orderItemsData = items.map((item) => {
                const product = products.find(p => p.id === item.productId);
                if (!product)
                    throw new AppError_1.AppError(`Product not found: ${item.productId}`, 404);
                total += product.price * item.quantity;
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    price: product.price
                };
            });
            const kartCoinsEarned = Math.floor(total * 0.1);
            dbOrder = await db_1.default.order.create({
                data: {
                    userId: req.user.id,
                    vendorId,
                    total,
                    deliveryAddress,
                    paymentMethod: paymentMethod || 'UPI',
                    kartCoinsEarned,
                    items: {
                        create: orderItemsData
                    }
                }
            });
            // Create payment record
            await db_1.default.payment.create({
                data: {
                    orderId: dbOrder.id,
                    userId: req.user.id,
                    amount: total + 30,
                    paymentStatus: 'pending',
                    method: paymentMethod || 'UPI'
                }
            });
        }
        else {
            return next(new AppError_1.AppError('Invalid request: orderId or items required', 400));
        }
        // Security check: Use the actual computed amount (item total + flat 30 delivery)
        const finalAmount = dbOrder ? dbOrder.total + 30 : amount;
        const razorpayOrder = await paymentService_1.paymentService.createRazorpayOrder(finalAmount, currency);
        res.status(200).json({
            success: true,
            data: {
                orderId: dbOrder.id,
                razorpayOrderId: razorpayOrder.id,
                amount: finalAmount,
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