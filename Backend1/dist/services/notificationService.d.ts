export declare const notificationService: {
    sendOTPEmail: (email: string, otp: string) => Promise<import("winston").Logger | undefined>;
    sendOrderConfirmation: (email: string, orderId: string) => Promise<import("winston").Logger | undefined>;
    sendOrderStatusUpdate: (email: string, orderId: string, status: string) => Promise<void>;
    notifyCourierNewDelivery: (courierId: string, orderId: string) => Promise<void>;
};
//# sourceMappingURL=notificationService.d.ts.map