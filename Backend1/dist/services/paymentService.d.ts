export declare const paymentService: {
    createRazorpayOrder: (amount: number, currency?: string) => Promise<import("razorpay/dist/types/orders").Orders.RazorpayOrder>;
    verifyRazorpaySignature: (paymentId: string, orderId: string, signature: string) => boolean;
    generateReceipt: (order: any) => string;
};
//# sourceMappingURL=paymentService.d.ts.map