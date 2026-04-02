import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count();
  const products = await prisma.product.findMany({ 
    select: { 
      id: true, 
      name: true, 
      category: true, 
      price: true, 
      vendor: { select: { name: true } }, 
      isBestseller: true 
    }
  });
  
  console.log('✓ Database Seeded Successfully!');
  console.log('');
  console.log('Total Products:', productCount);
  console.log('');
  console.log('Products by Category:');
  const grouped: any = {};
  products.forEach((p: any) => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });
  
  Object.entries(grouped).forEach(([cat, items]: any) => {
    console.log(`  ${cat}: ${items.length} products`);
  });
  
  console.log('');
  console.log('Bestsellers:');
  products.filter((p: any) => p.isBestseller).forEach((p: any) => {
    console.log(`  ⭐ ${p.name} - ₹${p.price} (${p.vendor.name})`);
  });
  
  await prisma.$disconnect();
}

main();
