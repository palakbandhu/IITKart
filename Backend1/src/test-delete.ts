import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log("All products:");
  console.dir(products.slice(0, 5), { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
