import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { initDb } from './db/index';

// Import routers
import authRouter from './routes/auth.routes';
import mastersRouter from './routes/masters.routes';
import transactionsRouter from './routes/transactions.routes';
import reportsRouter from './routes/reports.routes';
import settingsRouter from './routes/settings.routes';
import accvoucherRouter from './routes/accvoucher.routes';
import openingRouter from './routes/opening.routes';
import { settingsService } from './services/settings.service';

const app = express();
const port = process.env.PORT || 5000;

// Only the app's own window may call the API: the Vite dev server in development,
// and the packaged window (loaded from file://, which sends Origin "null").
app.use(cors({ origin: ['http://localhost:3000', 'null'] }));

// Configure JSON request body parser (except for raw file uploads)
app.use(express.json({ limit: '10mb' }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/masters', mastersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/accvoucher', accvoucherRouter);
app.use('/api/opening', openingRouter);

// Root Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', database: process.env.DB_PATH });
});

// Initialize database schema and seed data, then start listener
async function startServer() {

  try {
    await initDb();
    // Listen on this PC only. Other machines on the network cannot reach the API.
    app.listen(Number(port), '127.0.0.1', () => {
      console.log(`TexFin Express API server running on port ${port}`);
    });

    // Daily backup: no cron dependency, just an hourly "is it due yet" check.
    settingsService.runScheduledBackupIfDue().catch((err) => console.error('Scheduled backup check failed:', err));
    setInterval(() => {
      settingsService.runScheduledBackupIfDue().catch((err) => console.error('Scheduled backup check failed:', err));
    }, 60 * 60 * 1000);
  } catch (error) {
    console.error(error);
  }
}

// Trigger bootstrap
startServer();

export default app;
