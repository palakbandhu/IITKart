import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addAdmin() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@iitk.ac.in' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists. Checking password... (We will just update it to be sure)');
    const passwordHash = await bcrypt.hash('password123', 12);
    await prisma.user.update({
      where: { email: 'admin@iitk.ac.in' },
      data: { passwordHash, role: 'admin' },
    });
    console.log('Admin user updated successfully.');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 12);

  await prisma.user.create({
    data: {
      name: 'Master Admin',
      email: 'admin@iitk.ac.in',
      passwordHash,
      role: 'admin',
    },
  });

  console.log('Admin user created successfully.');
}

addAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
