"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
let razorpay = null;
if (env_1.env.RAZORPAY_KEY_ID && env_1.env.RAZORPAY_KEY_SECRET) {
    razorpay = new razorpay_1.default({
        key_id: env_1.env.RAZORPAY_KEY_ID,
        key_secret: env_1.env.RAZORPAY_KEY_SECRET,
    });
}
exports.paymentService = {
    createRazorpayOrder: async (amount, currency = 'INR') => {
        if (!razorpay)
            throw new Error('Razorpay not configured');
        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit
            currency,
        };
        const order = await razorpay.orders.create(options);
        return order;
    },
    verifyRazorpaySignature: (paymentId, orderId, signature) => {
        if (!env_1.env.RAZORPAY_KEY_SECRET)
            return false;
        const body = orderId + "|" + paymentId;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', env_1.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        return expectedSignature === signature;
    },
    generateReceipt: (order) => {
        const itemTotal = order.total;
        const total = itemTotal + 30; // 30 is delivery charge
        return `
╔════════════════════════════════╗
║       ORDER RECEIPT           ║
║          IITKart              ║
╠════════════════════════════════╣
║ Order: ${order.id}
║ Payment: ${order.payment?.id || 'N/A'}
║ Date: ${order.createdAt.toISOString().split('T')[0]}
║ Item Total:     ₹${itemTotal.toFixed(2)}
║ Delivery:       ₹30.00
║ ────────────────────────────
║ TOTAL:          ₹${total.toFixed(2)}
║ Method: ${order.paymentMethod}
║ Status: ${order.status}
║ Address: ${order.deliveryAddress}
╚════════════════════════════════╝
    `.trim();
    }
};
//# sourceMappingURL=paymentService.js.map