import crypto from "crypto";
import bcrypt from "bcryptjs";


export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}


export async function hashOTP(otp: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
}


export async function verifyOTPHash(otp: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(otp, hash);
}


export function sendOTP(phone: string, otp: string): void {
  console.log("\n--- [MOCK SMS SERVICE] ---");
  console.log(`To: ${phone}`);
  console.log(`Message: Your IITKart OTP is ${otp}`);
  console.log("--------------------------\n");
}