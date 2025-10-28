// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import prisma from './database/prismaClient';

// dotenv.config();

// const app = express();
// app.use(express.json());
// app.use(cors());

// app.get('/', async (req, res) => {
//   const dbTest = await prisma.$queryRaw`SELECT NOW()`;
//   res.json({ message: 'Payment Service Running', dbTime: dbTest });
// });

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, async () => {
//   try {
//     await prisma.$connect();
//     console.log('✅ Connected to Supabase Postgres');
//   } catch (err) {
//     console.error('❌ Database connection failed:', err);
//   }
//   console.log(`🚀 Payment Service running at http://localhost:${PORT}`);
// });
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import walletRoutes from './routes/wallet.routes';
import transactionRoutes from './routes/transaction.routes';
const app: Application = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Payment Microservice is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Payment Microservice running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Wallet API: http://localhost:${PORT}/api/wallets`);
});

export default app;