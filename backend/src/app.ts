
import './config/env';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { doubleSubmitCookieMiddleware, csrfErrorHandler } from './middleware/csrf.middleware';
import routes from './routes';

const app = express();

// Trust reverse proxy (Railway/Vercel) for rate limiting & accurate IPs
app.set('trust proxy', 1);

// 1. CORS - MUST BE FIRST for proper preflight handling
// ... existing origins ...
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'https://school-app-oliskeylee.vercel.app',
    'https://school-app-git-main-oliskeylee.vercel.app',
    'https://school-app-production-a59a.up.railway.app'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
        const isVercel = origin.includes('vercel.app');
        const isRailway = origin.includes('railway.app');

        if (isLocal || isVercel || isRailway || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Fallback for debugging, but still allow in dev
            console.log(`📡 [CORS] Request from unknown origin: ${origin}`);
            callback(null, true); 
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'X-Branch-Id', 'x-branch-id', 'Accept', 'X-Requested-With', 'application-id', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400
}));

// 2. Core Middlewares
app.use(cookieParser(config.jwtSecret));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lead DevSecOps: Apply Anti-CSRF protection globally, except for refresh endpoint
// to handle cross-site cookie blocking on mobile browsers.
app.use((req, res, next) => {
    if (req.path === '/api/auth/refresh' || req.path === '/api/auth/logout') {
        return next();
    }
    doubleSubmitCookieMiddleware(req, res, next);
});
app.use(csrfErrorHandler);

// 3. Standardize URL: Remove trailing slash
app.use((req, res, next) => {
    // Early diagnostic for the problematic endpoint
    if (req.url.includes('/api/auth/demo/login')) {
        console.log(`🔌 [DIAGNOSTIC] Request to ${req.url} | Method: ${req.method} | IP: ${req.ip} | Origin: ${req.headers.origin}`);
    }

    if (req.url.length > 1 && req.url.endsWith('/')) {
        req.url = req.url.slice(0, -1);
    }

    // Diagnostic for notifications
    if (req.url.includes('/notifications')) {
        console.log(`🔔 [DIAGNOSTIC-GLOBAL] ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`);
    }
    
    next();
});

// 4. Logging
app.use(morgan('dev'));

// 4. Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://api.dicebear.com", "http://localhost:5000", "https://*.railway.app"],
            connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000", "https://*.vercel.app", "https://*.railway.app"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// 5. Global Rate Limiting
const isProduction = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5000, // Increased from 200 to 5000 to handle background polling and dashboard load
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => {
        // Skip rate limiting in development, for preflight OPTIONS requests, and for localhost
        if (process.env.NODE_ENV !== 'production') return true;
        if (req.method === 'OPTIONS') return true;
        
        // Robust localhost check
        const ip = req.ip || req.connection.remoteAddress;
        if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return true;
        
        return false;
    },
});

app.use('/api', limiter);

// 6. Basic health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS Backend' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS Backend' });
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


// 7. API Routes - Standardized Mount
app.use('/api', routes);

// [DEBUG] Catch-all for POST to see if it reaches here
app.post('*path', (req, res, next) => {
    console.log(`📡 [DEBUG-POST] Unmatched POST to ${req.url}`);
    next();
});

// Fallback for non-prefixed calls (legacy or proxy compatibility)
app.use((req, res, next) => {
    // If it's not an API call and not already handled, it's a 404
    if (!req.url.startsWith('/api')) {
        // But we allow health checks without prefix
        if (req.url === '/' || req.url === '/health') return next();
    }
    // Otherwise, we don't allow non-prefixed API calls anymore for clarity
    next();
});

// 8. 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: `Route ${req.originalUrl} does not exist on this server.` 
    });
});

// 9. Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('🔥 [Global Error]');
    console.error('   Path:', req.path);
    console.error('   Method:', req.method);
    console.error('   Error Name:', err.name);
    console.error('   Error Message:', err.message);
    
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred.',
        path: req.path
    });
});

export { app };
