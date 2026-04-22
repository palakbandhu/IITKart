import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';

let razorpay: Razorpay | null = null;
if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export const paymentService = {
  createRazorpayOrder: async (amount: number, currency: string = 'INR') => {
    if (!razorpay) throw new Error('Razorpay not configured');
    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit
      currency,
    };
    const order = await razorpay.orders.create(options);
    return order;
  },
  verifyRazorpaySignature: (paymentId: string, orderId: string, signature: string): boolean => {
    if (!env.RAZORPAY_KEY_SECRET) return false;
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    return expectedSignature === signature;
  },
  generateReceipt: (order: any): string => {
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
║ Method: ${order.payment?.method || order.paymentMethod}
║ Status: ${order.status}
║ Address: ${order.deliveryAddress}
╚════════════════════════════════╝
    `.trim();
  }
};
