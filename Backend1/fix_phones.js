const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUniqueViolations() {
  const users = await prisma.user.findMany();
  const seenPhones = new Set();
  
  for (const user of users) {
    if (user.phone === "") {
        await prisma.user.update({
            where: { id: user.id },
            data: { phone: null }
        });
        continue;
    }
    
    if (user.phone && seenPhones.has(user.phone)) {
       await prisma.user.update({
          where: { id: user.id },
          data: { phone: null }
       });
       console.log("Cleared duplicate phone for", user.id);
    } else if (user.phone) {
       seenPhones.add(user.phone);
    }
  }

  const pusers = await prisma.pendingUser.findMany();
  const seenPhonesP = new Set();
  for (const p of pusers) {
    if (p.phone === "") {
        await prisma.pendingUser.update({
            where: { id: p.id },
            data: { phone: null }
        });
        continue;
    }
    if (p.phone && seenPhonesP.has(p.phone)) {
       await prisma.pendingUser.update({
          where: { id: p.id },
          data: { phone: null }
       });
       console.log("Cleared duplicate phone for pending user", p.id);
    } else if (p.phone) {
       seenPhonesP.add(p.phone);
    }
  }

  console.log("Done");
}

fixUniqueViolations().catch(console.error).finally(() => prisma.$disconnect());
