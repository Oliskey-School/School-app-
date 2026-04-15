
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes';

const app = express();

// 1. Body parsers — must come before any route or middleware that reads req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. CORS — allow all origins with the required methods/headers
app.use(cors({
    origin: true, // Echoes the request origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'Accept', 'X-Requested-With', 'application-id'],
    credentials: true,
    maxAge: 86400
}));

// 3. Preflight handler + trailing-slash normalisation + request logging
app.use((req, res, next) => {
    // Normalise URL: strip trailing slash so /api/auth/demo/login/ works too
    if (req.url.length > 1 && req.url.endsWith('/')) {
        req.url = req.url.slice(0, -1);
    }

    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin || '*';
        process.stdout.write(`🔍 [PREFLIGHT] ${req.method} ${req.url} - Origin: ${origin}\n`);

        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-school-id, Accept, X-Requested-With, application-id');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');

        return res.status(204).end();
    }

    // Normal request logging
    process.stdout.write(`${new Date().toISOString()} [${req.method}] ${req.url} - Origin: ${req.headers.origin}\n`);
    next();
});

// 4. Hardened Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://api.dicebear.com"],
            connectSrc: ["'self'", "http://localhost:5000", "https://*.vercel.app", "https://*.railway.app"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// 5. Global Rate Limiting (Production only — disabled in development to avoid stale windows)
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


// Basic health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS Backend' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS Backend' });
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 6. API Routes
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
