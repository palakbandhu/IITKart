import prisma from './src/config/db';

async function test() {
  const user = await prisma.user.findFirst({ where: { email: 'amul@iitk.ac.in' } });
  console.log("User:", user);
  if (user) {
    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    console.log("Vendor:", vendor);
  }
}

test();
