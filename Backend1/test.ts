import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.order.findMany({
    where: { vendorRating: { not: null } },
    select: { id: true, vendorRating: true, vendorId: true }
  });
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, rating: true }
  });
  console.log('Orders with vendorRating:', orders);
  console.log('Vendors:', vendors);
}
main().finally(() => prisma.$disconnect());
