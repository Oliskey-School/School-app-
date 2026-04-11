
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes';

const app = express();

// 0. VERY FIRST: Handle CORS and Preflight
app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins in development or if origin is in allowed list
        const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:3001'];
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'Accept', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 204
}));

// Request logger for debugging
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log(`🔍 [PREFLIGHT] ${req.url} - Origin: ${req.headers.origin}`);
    } else {
        console.log(`${new Date().toISOString()} [${req.method}] ${req.url} - Origin: ${req.headers.origin}`);
    }
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. Hardened Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://api.dicebear.com"],
            connectSrc: ["'self'", "http://localhost:5000"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// 2. Global Rate Limiting (Production only — disabled in development to avoid stale windows)
const isProduction = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 200, // 200 requests per 15 min per IP in production
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => {
        // Skip rate limiting in development and for preflight OPTIONS requests
        if (process.env.NODE_ENV !== 'production') return true;
        if (req.method === 'OPTIONS') return true;
        return false;
    },
});

app.use('/api', limiter);

app.use(morgan('dev'));

// Ensure all preflight requests are handled explicitly (Express 5 compatible wildcard)
app.options('/{*path}', cors());

// Basic health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS Backend' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS Backend' });
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: `Route ${req.originalUrl} does not exist on this server.` 
    });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('🔥 [Global Error]');
    console.error('   Path:', req.path);
    console.error('   Method:', req.method);
    console.error('   Error Name:', err.name);
    console.error('   Error Message:', err.message);
    if (err.stack) {
        console.error('   Stack:', err.stack);
    }
    
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred.',
        path: req.path // Include path for easier debugging
    });
});

export { app };
