/*
  Warnings:

  - You are about to drop the column `otp` on the `PendingUser` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiry` on the `PendingUser` table. All the data in the column will be lost.
  - You are about to drop the column `otp` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- AlterTable
ALTER TABLE "CourierProfile" ADD COLUMN     "ignoredOrders" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PendingUser" DROP COLUMN "otp",
DROP COLUMN "otpExpiry";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "otp",
DROP COLUMN "otpExpiry";

-- DropTable
DROP TABLE "PasswordResetToken";

-- CreateTable
CREATE TABLE "OTPRecord" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTPRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OTPRecord_email_otp_purpose_idx" ON "OTPRecord"("email", "otp", "purpose");
