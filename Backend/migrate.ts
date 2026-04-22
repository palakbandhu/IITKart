import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN "kartCoinsUsed" INTEGER NOT NULL DEFAULT 0;');
    console.log('Added kartCoinsUsed');
  } catch (e: any) {
    console.log('Error adding kartCoinsUsed (might already exist):', e.message);
  }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN "coinsProcessed" BOOLEAN NOT NULL DEFAULT false;');
    console.log('Added coinsProcessed');
  } catch (e: any) {
    console.log('Error adding coinsProcessed (might already exist):', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
