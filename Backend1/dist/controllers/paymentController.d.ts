import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
export declare const createRazorpayOrder: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyPayment: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getPaymentHistory: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getReceipt: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=paymentController.d.ts.map