import jwt from 'jsonwebtoken';
export declare const authService: {
    hashPassword: (password: string) => Promise<string>;
    comparePassword: (plain: string, hash: string) => Promise<boolean>;
    generateAccessToken: (id: string, role: string) => string;
    generateRefreshToken: (id: string) => string;
    verifyAccessToken: (token: string) => string | jwt.JwtPayload;
    verifyRefreshToken: (token: string) => string | jwt.JwtPayload;
    generateOTP: () => string;
    hashOTP: (otp: string) => Promise<string>;
};
//# sourceMappingURL=authService.d.ts.map