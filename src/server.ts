import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import walletRoutes from './routes/wallet.routes';
import transactionRoutes from './routes/transaction.routes';
import paymentGatewayRoutes from './routes/paymentGateway.routes';
import paymentRoutes from './routes/payment.routes';
import payoutRoutes from './routes/payout.routes';
import adminRoutes from './routes/admin.routes';
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
//change to allow only from specific origins in production
app.use(
  cors({
    origin: '*', // Allow all origins
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Raw body for webhooks (needed for signature verification)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

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
app.use('/api/gateways', paymentGatewayRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/admin', adminRoutes);
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
  console.log(`💳 Transaction API: http://localhost:${PORT}/api/transactions`);
  console.log(`🔌 Gateway API: http://localhost:${PORT}/api/gateways`);
  console.log(`💵 Payment API: http://localhost:${PORT}/api/payments`);
});
process.stdin.resume(); 

export default app;