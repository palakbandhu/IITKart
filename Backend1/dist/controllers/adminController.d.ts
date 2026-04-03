import { Request, Response, NextFunction } from 'express';
export declare const getPlatformStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const banUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listVendors: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const toggleVendorStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getOrders: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const forceUpdateOrderStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getComplaints: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const resolveComplaint: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getDeliveryIssues: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateDeliveryIssue: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportUsersCSV: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const exportVendorsCSV: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const exportOrdersCSV: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminController.d.ts.map