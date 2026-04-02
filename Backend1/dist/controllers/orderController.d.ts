import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
export declare const placeOrder: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getOrderById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateOrderStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const assignCourier: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rateOrder: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const submitComplaint: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getActiveOrders: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=orderController.d.ts.map