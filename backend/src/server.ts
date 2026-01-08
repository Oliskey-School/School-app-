
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './api/routes/auth.routes';
import studentRoutes from './api/routes/student.routes';
import teacherRoutes from './api/routes/teacher.routes';
import cbtRoutes from './api/routes/cbt.routes';
import adminRoutes from './api/routes/admin.routes';
import { errorHandler } from './api/middleware/error.middleware';

import aiRoutes from './api/routes/ai.routes';
import path from 'path';

// Load .env from backend folder OR root folder
const result = dotenv.config();
if (result.error) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const app: Express = express();
const port = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging
app.use(morgan('dev'));

// Parsing
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/cbt', cbtRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Smart School App Backend is running!' });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
