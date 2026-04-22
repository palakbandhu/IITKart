import app from './app';
import { env } from './config/env';
import prisma from './config/db';
import { logger } from './utils/logger';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';

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
    
    // Ghost Order Sweeper: Cancel any strictly 'pending' orders older than 15 mins
    cron.schedule('*/5 * * * *', async () => {
      logger.info('🧹 Running Ghost Order Sweeper...');
      try {
        const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
        const ghostOrders = await prisma.order.findMany({
          where: {
            status: 'pending',
            createdAt: { lt: threshold },
            paymentStatus: { not: 'success' },
            paymentMethod: { notIn: ['COD', 'Cash on Delivery'] }
          }
        });

        if (ghostOrders.length > 0) {
          logger.info(`Found ${ghostOrders.length} ghost orders. Reverting stock & cancelling...`);
          for (const order of ghostOrders) {
            await prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: { status: 'cancelled' }
              });
              
              const orderItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
              for (const item of orderItems) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stockQuantity: { increment: item.quantity },
                    inStock: true
                  }
                });
              }
            });
          }
          logger.info('🧹 Sweeper finished successfully.');
        }
      } catch (err) {
        logger.error('Ghost Order Sweeper encountered an error:', err);
      }
    });
    
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
