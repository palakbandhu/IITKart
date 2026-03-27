import prisma from './src/config/db';

async function test() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  console.log("Users:", users);
  
  const vendors = await prisma.vendor.findMany({ select: { id: true, userId: true, email: true } });
  console.log("Vendors:", vendors);
}

test();
