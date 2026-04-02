export declare const orderService: {
    calculateOrderTotal: (items: {
        productId: string;
        quantity: number;
    }[]) => Promise<number>;
    calculateKartCoins: (total: number) => number;
    calculateCourierEarnings: (total: number) => number;
    validateSingleVendorCart: (items: {
        productId: string;
    }[]) => Promise<string>;
    processOrderDelivery: (orderId: string) => Promise<void>;
};
//# sourceMappingURL=orderService.d.ts.map