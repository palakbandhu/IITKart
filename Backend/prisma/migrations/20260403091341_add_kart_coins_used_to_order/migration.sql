-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "coinsProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kartCoinsUsed" INTEGER NOT NULL DEFAULT 0;
