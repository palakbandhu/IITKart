import { Request, Response, NextFunction } from 'express';
export declare const register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyRegistrationOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const resendRegistrationOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMe: (req: any, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map