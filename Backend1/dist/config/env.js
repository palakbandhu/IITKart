"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    REFRESH_TOKEN_SECRET: zod_1.z.string().min(32),
    REFRESH_TOKEN_EXPIRES_IN: zod_1.z.string().default('30d'),
    PORT: zod_1.z.string().transform(Number).default('5000'),
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    FRONTEND_URL: zod_1.z.string().url(),
    RAZORPAY_KEY_ID: zod_1.z.string().optional(),
    RAZORPAY_KEY_SECRET: zod_1.z.string().optional(),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().transform(Number).optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    FROM_EMAIL: zod_1.z.string().email().optional(),
});
exports.env = envSchema.parse(process.env);
//# sourceMappingURL=env.js.map