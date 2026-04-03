"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
exports.authService = {
    hashPassword: async (password) => bcryptjs_1.default.hash(password, 12),
    comparePassword: async (plain, hash) => bcryptjs_1.default.compare(plain, hash),
    generateAccessToken: (id, role) => jsonwebtoken_1.default.sign({ id, role }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN }),
    generateRefreshToken: (id) => jsonwebtoken_1.default.sign({ id }, env_1.env.REFRESH_TOKEN_SECRET, { expiresIn: env_1.env.REFRESH_TOKEN_EXPIRES_IN }),
    verifyAccessToken: (token) => jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET),
    verifyRefreshToken: (token) => jsonwebtoken_1.default.verify(token, env_1.env.REFRESH_TOKEN_SECRET),
    generateOTP: () => Math.floor(100000 + Math.random() * 900000).toString(),
    hashOTP: async (otp) => bcryptjs_1.default.hash(otp, 12)
};
//# sourceMappingURL=authService.js.map