
import './load-env'; // Must be first
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import aiRoutes from './api/routes/ai.routes';

// Load .env logic
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
app.use('/api/ai', aiRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'AI Assistant Server is running!' });
});

app.listen(port, () => {
    console.log(`[server]: AI Server is running at http://localhost:${port}`);
});
