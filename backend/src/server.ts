import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from "./routes/userRoutes.js";
import riderRoutes from './routes/riderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/cart', cartRoutes);


app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'IITKart Backend is running!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 
