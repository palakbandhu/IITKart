import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes      from './routes/authRoutes.js';
import userRoutes      from './routes/userRoutes.js';
import productRoutes   from './routes/productRoutes.js';
import cartRoutes      from './routes/cartRoutes.js';
import orderRoutes     from './routes/orderRoutes.js';
import vendorRoutes    from './routes/vendorRoutes.js';
import riderRoutes     from './routes/riderRoutes.js';
import reviewRoutes    from './routes/reviewRoutes.js';
import paymentRoutes   from './routes/paymentRoutes.js';
import walletRoutes    from './routes/walletRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import adminRoutes     from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { logger } from './utils/logger.js';

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static files ─────────────────────────────────────────────────────────────
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── HTTP request logging ──────────────────────────────────────────────────────
app.use(morgan('dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Rate limiting on auth routes ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,
  message:  { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/vendors',    vendorRoutes);
app.use('/api/riders',     riderRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/wallet',     walletRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin',      adminRoutes);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

export default app;