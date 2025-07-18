import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from '@/routes/auth.routes';
import accountsRoutes from '@/routes/accounts.routes';
import transactionsRoutes from '@/routes/transactions.routes';
import aiAgentRoutes from '@/routes/aiAgent.routes';
import documentsRoutes from '@/routes/documents.routes';
import customersRoutes from '@/routes/customers.routes';
import vendorsRoutes from '@/routes/vendors.routes';
import taxAgentRoutes from '@/routes/taxAgent.routes';
import logger from '@/utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const API_VERSION = process.env.API_VERSION || 'v1';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
const healthResponse = (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

app.get('/health', healthResponse);
app.get(`/api/${API_VERSION}/health`, healthResponse);

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/accounts`, accountsRoutes);
app.use(`/api/${API_VERSION}`, transactionsRoutes);
app.use(`/api/${API_VERSION}/ai`, aiAgentRoutes);
app.use(`/api/${API_VERSION}/documents`, documentsRoutes);
app.use(`/api/${API_VERSION}`, customersRoutes);
app.use(`/api/${API_VERSION}`, vendorsRoutes);
app.use(`/api/${API_VERSION}/tax`, taxAgentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Financial AI Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Version: ${API_VERSION}`);
}).on('error', (err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export default app;