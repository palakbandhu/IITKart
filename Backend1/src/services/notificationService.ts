import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: env.SMTP_PORT || 587,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const notificationService = {
  sendOTPEmail: async (email: string, otp: string) => {
    if (!env.SMTP_USER) return logger.warn(`SMTP not configured. OTP for ${email}: ${otp}`);
    try {
      await transporter.sendMail({
        from: env.FROM_EMAIL,
        to: email,
        subject: 'IITKart - Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}. It expires in 5 minutes.`
      });
    } catch (e) {
      logger.error('Failed to send OTP email', e);
    }
  },
  sendRegistrationOTP: async (email: string, otp: string) => {
    if (!env.SMTP_USER) return logger.warn(`SMTP not configured. Reg OTP for ${email}: ${otp}`);
    try {
      await transporter.sendMail({
        from: env.FROM_EMAIL,
        to: email,
        subject: 'IITKart - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #1E3A8A; text-align: center;">Welcome to IITKart!</h2>
            <p>Your email verification OTP is</p>
            <h1 style="text-align: center; color: #F97316; letter-spacing: 5px;">${otp}</h1>
            <p style="text-align: center;">It will expire in 10 minutes. Please enter this code in the app to complete your registration.</p>
          </div>
        `
      });
    } catch (e) {
      logger.error('Failed to send Registration OTP email', e);
    }
  },
  sendOrderConfirmation: async (email: string, orderId: string) => {
    if (!env.SMTP_USER) return logger.info(`Order confirmation for ${orderId}`);
    try {
      await transporter.sendMail({
        from: env.FROM_EMAIL,
        to: email,
        subject: `IITKart - Order ${orderId} Confirmed`,
        text: `Your order ${orderId} has been confirmed.`
      });
    } catch (e) {
      logger.error('Failed to send order email', e);
    }
  },
  sendOrderStatusUpdate: async (email: string, orderId: string, status: string) => {
    if (!env.SMTP_USER) return;
    try {
      await transporter.sendMail({
        from: env.FROM_EMAIL,
        to: email,
        subject: `IITKart - Order ${orderId} is now ${status}`,
        text: `Your order ${orderId} is now ${status}.`
      });
    } catch (e) {
      logger.error('Failed to send status update', e);
    }
  },
  notifyCourierNewDelivery: async (courierId: string, orderId: string) => {
    logger.info(`Push Notification (mock): Courier ${courierId}, new assignment ${orderId}`);
  }
};
