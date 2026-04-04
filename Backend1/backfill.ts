import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany();
  for (const vendor of vendors) {
    const agg = await prisma.order.aggregate({
      where: { vendorId: vendor.id, vendorRating: { not: null } },
      _avg: { vendorRating: true }
    });
    if (agg._avg.vendorRating !== null) {
      console.log(`Updating ${vendor.name} to rating ${agg._avg.vendorRating}`);
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { rating: agg._avg.vendorRating }
      });
    }
  }
}
main().finally(() => prisma.$disconnect());
