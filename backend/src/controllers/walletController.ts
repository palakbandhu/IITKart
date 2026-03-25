import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── GET /api/wallet ───────────────────────────────────────────────────────────
export const getWallet = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  const wallet = await prisma.kartWallet.upsert({
    where:  { userId },
    create: { userId, balance: 0 },
    update: {},
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take:    20,
      },
    },
  });

  // 10 Kart Coins = ₹1 discount
  const COINS_TO_RUPEES = 0.1;

  res.json({
    balance:          wallet.balance,
    valueInRupees:    parseFloat((wallet.balance * COINS_TO_RUPEES).toFixed(2)),
    recentTransactions: wallet.transactions,
  });
});
