import { User } from '@prisma/client';
export declare const generateOrderId: () => string;
export declare const generatePaymentId: () => string;
export declare const sanitizeUser: (user: User) => {
    role: string;
    status: import(".prisma/client").$Enums.UserStatus;
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    photo: string | null;
    kartCoins: number;
    favorites: string[];
    createdAt: Date;
    updatedAt: Date;
};
export declare const paginateQuery: (page: number, limit: number) => {
    skip: number;
    take: number;
};
export declare const exportToCSV: (data: object[], filename: string) => string;
//# sourceMappingURL=helpers.d.ts.map