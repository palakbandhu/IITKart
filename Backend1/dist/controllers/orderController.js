"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveOrders = exports.submitComplaint = exports.rateOrder = exports.assignCourier = exports.updateOrderStatus = exports.getOrderById = exports.placeOrder = void 0;
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
const orderService_1 = require("../services/orderService");
const placeOrder = async (req, res, next) => {
    try {
        const { vendorId, items, deliveryAddress, paymentMethod } = req.body;
        const validatedVendorId = await orderService_1.orderService.validateSingleVendorCart(items);
        if (validatedVendorId !== vendorId)
            throw new AppError_1.AppError('Vendor mismatch', 400);
        const productIds = items.map((i) => i.productId);
        const products = await db_1.default.product.findMany({ where: { id: { in: productIds } } });
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
        const kartCoinsEarned = orderService_1.orderService.calculateKartCoins(total);
        const order = await db_1.default.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    userId: req.user.id,
                    vendorId,
                    total,
                    deliveryAddress,
                    paymentMethod,
                    kartCoinsEarned,
                    items: {
                        create: orderItemsData
                    }
                },
                include: { items: true }
            });
            await tx.payment.create({
                data: {
                    orderId: newOrder.id,
                    userId: req.user.id,
                    amount: total + 30, // 30 is delivery charge
                    paymentStatus: 'pending',
                    method: paymentMethod
                }
            });
            await tx.user.update({
                where: { id: req.user.id },
                data: { kartCoins: { increment: kartCoinsEarned } }
            });
            return newOrder;
        });
        res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.placeOrder = placeOrder;
const getOrderById = async (req, res, next) => {
    try {
        const order = await db_1.default.order.findUnique({
            where: { id: req.params.id },
            include: { vendor: true, courier: true, items: { include: { product: true } } }
        });
        if (!order)
            return next(new AppError_1.AppError('Order not found', 404));
        res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const existingOrder = await db_1.default.order.findUnique({
            where: { id: req.params.id }
        });
        if (!existingOrder)
            return next(new AppError_1.AppError('Order not found', 404));
        // Idempotency check: don't process if status is already the same
        if (existingOrder.status === status) {
            return res.status(200).json({ success: true, data: existingOrder });
        }
        const order = await db_1.default.order.update({
            where: { id: req.params.id },
            data: { status }
        });
        if (status === 'delivered') {
            await orderService_1.orderService.processOrderDelivery(order.id);
        }
        res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrderStatus = updateOrderStatus;
const assignCourier = async (req, res, next) => {
    try {
        const { courierId } = req.body;
        const order = await db_1.default.order.update({
            where: { id: req.params.id },
            data: { courierId }
        });
        res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.assignCourier = assignCourier;
const rateOrder = async (req, res, next) => {
    try {
        const { type, rating, feedback } = req.body;
        const data = {};
        if (type === 'vendor') {
            data.vendorRating = rating;
            data.vendorFeedback = feedback;
        }
        else if (type === 'courier') {
            data.courierRating = rating;
            data.courierFeedback = feedback;
        }
        else if (type === 'product') {
            data.rating = rating;
            data.feedback = feedback;
        }
        const order = await db_1.default.order.update({
            where: { id: req.params.id },
            data
        });
        res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        next(error);
    }
};
exports.rateOrder = rateOrder;
const submitComplaint = async (req, res, next) => {
    try {
        const { subject, description, type } = req.body;
        const complaint = await db_1.default.complaint.create({
            data: {
                userId: req.user.id,
                orderId: req.params.id,
                subject,
                description,
                type
            }
        });
        res.status(201).json({ success: true, data: complaint });
    }
    catch (error) {
        next(error);
    }
};
exports.submitComplaint = submitComplaint;
const getActiveOrders = async (req, res, next) => {
    try {
        const orders = await db_1.default.order.findMany({
            where: { status: { in: ['pending', 'accepted', 'picked'] } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: orders });
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveOrders = getActiveOrders;
//# sourceMappingURL=orderController.js.map