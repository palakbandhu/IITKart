"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = void 0;
const db_1 = __importDefault(require("../config/db"));
const AppError_1 = require("../utils/AppError");
exports.orderService = {
    calculateOrderTotal: async (items) => {
        let total = 0;
        for (const item of items) {
            const product = await db_1.default.product.findUnique({ where: { id: item.productId } });
            if (!product)
                throw new AppError_1.AppError(`Product not found: ${item.productId}`, 404);
            total += product.price * item.quantity;
        }
        return total;
    },
    calculateKartCoins: (total) => Math.floor(total * 0.1),
    calculateCourierEarnings: (total) => Math.floor(total * 0.15) + 20,
    validateSingleVendorCart: async (items) => {
        if (items.length === 0)
            throw new AppError_1.AppError('Cart is empty', 400);
        const productIds = items.map(i => i.productId);
        const products = await db_1.default.product.findMany({ where: { id: { in: productIds } } });
        if (products.length !== productIds.length)
            throw new AppError_1.AppError('Some products not found', 404);
        const vendorIds = new Set(products.map(p => p.vendorId));
        if (vendorIds.size > 1)
            throw new AppError_1.AppError('All products must be from the same vendor', 400);
        return [...vendorIds][0];
    },
    processOrderDelivery: async (orderId) => {
        const order = await db_1.default.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new AppError_1.AppError('Order not found', 404);
        // update vendor stats
        await db_1.default.vendor.update({
            where: { id: order.vendorId },
            data: {
                totalOrders: { increment: 1 },
                totalEarnings: { increment: order.total }
            }
        });
        // Courier earnings
        if (order.courierId) {
            const earnings = exports.orderService.calculateCourierEarnings(order.total);
            await db_1.default.courierProfile.update({
                where: { userId: order.courierId },
                data: {
                    totalDeliveries: { increment: 1 },
                    totalEarnings: { increment: earnings }
                }
            });
        }
    }
};
//# sourceMappingURL=orderService.js.map