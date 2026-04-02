import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
export declare const getProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getPendingDeliveries: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const acceptDelivery: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rejectDelivery: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const markDelivered: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getActiveDeliveries: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getDeliveryHistory: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getEarnings: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const reportIssue: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getCourierJobs: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getFeedbacks: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=riderController.d.ts.map