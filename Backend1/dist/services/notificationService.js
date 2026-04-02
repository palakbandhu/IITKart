"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const transporter = nodemailer_1.default.createTransport({
    host: env_1.env.SMTP_HOST || 'smtp.gmail.com',
    port: env_1.env.SMTP_PORT || 587,
    auth: {
        user: env_1.env.SMTP_USER,
        pass: env_1.env.SMTP_PASS,
    },
});
exports.notificationService = {
    sendOTPEmail: async (email, otp) => {
        if (!env_1.env.SMTP_USER)
            return logger_1.logger.warn(`SMTP not configured. OTP for ${email}: ${otp}`);
        try {
            await transporter.sendMail({
                from: env_1.env.FROM_EMAIL,
                to: email,
                subject: 'IITKart - Password Reset OTP',
                text: `Your OTP for password reset is: ${otp}. It expires in 5 minutes.`
            });
        }
        catch (e) {
            logger_1.logger.error('Failed to send OTP email', e);
        }
    },
    sendOrderConfirmation: async (email, orderId) => {
        if (!env_1.env.SMTP_USER)
            return logger_1.logger.info(`Order confirmation for ${orderId}`);
        try {
            await transporter.sendMail({
                from: env_1.env.FROM_EMAIL,
                to: email,
                subject: `IITKart - Order ${orderId} Confirmed`,
                text: `Your order ${orderId} has been confirmed.`
            });
        }
        catch (e) {
            logger_1.logger.error('Failed to send order email', e);
        }
    },
    sendOrderStatusUpdate: async (email, orderId, status) => {
        if (!env_1.env.SMTP_USER)
            return;
        try {
            await transporter.sendMail({
                from: env_1.env.FROM_EMAIL,
                to: email,
                subject: `IITKart - Order ${orderId} is now ${status}`,
                text: `Your order ${orderId} is now ${status}.`
            });
        }
        catch (e) {
            logger_1.logger.error('Failed to send status update', e);
        }
    },
    notifyCourierNewDelivery: async (courierId, orderId) => {
        logger_1.logger.info(`Push Notification (mock): Courier ${courierId}, new assignment ${orderId}`);
    }
};
//# sourceMappingURL=notificationService.js.map