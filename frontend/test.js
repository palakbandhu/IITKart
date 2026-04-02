const { PrismaClient } = require('../Backend1/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'virendrak24@iitk.ac.in' } });
  console.log('USER:', user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
