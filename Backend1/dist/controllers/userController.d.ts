import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
export declare const getProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getFavorites: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const toggleFavorite: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getWallet: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getUserOrders: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getUserComplaints: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map