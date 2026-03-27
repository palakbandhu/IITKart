import app from './app';
import { env } from './config/env';
import prisma from './config/db';
import { logger } from './utils/logger';
import bcrypt from 'bcryptjs';

async function ensureSuperAdmin() {
  const email = 'admin@iitk.ac.in';
  try {
    const passwordHash = await bcrypt.hash('admin@123', 12);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: 'admin', isVerified: true },
      create: {
        name: 'Super Admin',
        email,
        passwordHash,
        role: 'admin',
        isVerified: true
      }
    });
    logger.info('🔑 Super Admin account guaranteed (admin@iitk.ac.in / admin@123)');
  } catch (error) {
    logger.error('Failed to ensure Super Admin:', error);
  }
}

async function main() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    await ensureSuperAdmin();
    
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// Handle unexpected closures
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected on app termination');
  process.exit(0);
});
