import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'virendrak24@iitk.ac.in';
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  // Find a vendor with at least one product
  const vendor = await prisma.vendor.findFirst({
    where: { products: { some: {} } },
    include: { products: true }
  });

  if (!vendor || vendor.products.length === 0) {
    console.error('No vendors with products found to create mock orders.');
    return;
  }

  const product = vendor.products[0];

  console.log(`Creating mock orders for ${user.name} from vendor ${vendor.name}`);

  // 1. Delivered order ready for rating
  const deliveredOrder = await prisma.order.create({
    data: {
      userId: user.id,
      vendorId: vendor.id,
      total: product.price,
      status: 'delivered',
      deliveryAddress: user.address || 'Campus',
      paymentStatus: 'success',
      paymentMethod: 'UPI',
      kartCoinsEarned: Math.floor(product.price * 0.1),
      items: {
        create: [
          { productId: product.id, quantity: 1, price: product.price }
        ]
      }
    }
  });

  // 2. Accepted order ready for tracking/complaint
  const acceptedOrder = await prisma.order.create({
    data: {
      userId: user.id,
      vendorId: vendor.id,
      total: product.price * 2,
      status: 'accepted',
      deliveryAddress: user.address || 'Campus',
      paymentStatus: 'success',
      paymentMethod: 'Card',
      kartCoinsEarned: Math.floor(product.price * 2 * 0.1),
      items: {
        create: [
          { productId: product.id, quantity: 2, price: product.price }
        ]
      }
    }
  });

  console.log('✅ Created Delivered Order:', deliveredOrder.id);
  console.log('✅ Created Accepted Order:', acceptedOrder.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
