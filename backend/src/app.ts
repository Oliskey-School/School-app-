
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
import { Sentry, sentryEnabled } from './config/instrument';
import routes from './routes';

const app = express();

// Trust reverse proxy (Railway/Vercel) for rate limiting & accurate IPs
app.set('trust proxy', 1);

// 1. CORS - MUST BE FIRST for proper preflight handling
// Strict allowlist. Extra origins can be supplied via CORS_ALLOWED_ORIGINS (comma-separated).
const STATIC_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'https://school-app-oliskeylee.vercel.app',
    'https://school-app-git-main-oliskeylee.vercel.app',
    'https://school-app-production-a59a.up.railway.app'
];

const ENV_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const allowedOrigins = new Set([...STATIC_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS]);
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors({
    origin: (origin, callback) => {
        // Same-origin / curl / native mobile: no Origin header
        if (!origin) return callback(null, true);

        if (allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        // In non-prod, allow localhost variants (and host.docker.internal, which
        // vite.config also allows) for developer flexibility / Docker-based testing.
        if (!IS_PROD && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('host.docker.internal'))) {
            return callback(null, true);
        }

        console.warn(`📡 [CORS] Blocked origin: ${origin}`);
        return callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'X-Branch-Id', 'x-branch-id', 'Accept', 'X-Requested-With', 'application-id', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400
}));

// 2. Core Middlewares
app.use(cookieParser(config.jwtSecret));
// Body limit. Profile/student photos are submitted inline as base64 data-URLs, which
// inflate a ~5 MB photo to ~7 MB of text — 2 MB was rejecting them ("request entity
// too large"). 15 MB comfortably fits a phone photo; uploads are still rate-limited.
const BODY_LIMIT = process.env.BODY_LIMIT || '15mb';
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

// Guarantee req.body is always an object so handlers that read req.body.x
// (e.g. branch scoping on DELETE/GET requests with no body) never crash.
app.use((req, _res, next) => {
    if (req.body == null) req.body = {};
    next();
});

// Lead DevSecOps: Apply Anti-CSRF protection globally, except for refresh endpoint
// to handle cross-site cookie blocking on mobile browsers.
app.use((req, res, next) => {
    const path = req.originalUrl || req.path;
    const isAuthAction = path.includes('/api/auth/refresh') || 
                        path.includes('/api/auth/logout') || 
                        path.includes('/api/auth/csrf-token') ||
                        path.includes('/api/auth/login') ||
                        path.includes('/api/auth/demo/login');

    // Lead DevSecOps: If the request has a valid Authorization header, skip CSRF.
    // Bearer tokens are added manually via JS and are not automatically sent by browsers
    // during cross-origin form submissions, making them inherently resistant to CSRF.
    // This fix is crucial for mobile users where third-party cookies (psid-csrf) are often blocked.
    if (isAuthAction || req.headers.authorization || process.env.NODE_ENV === 'test') {
        if (!isAuthAction && process.env.NODE_ENV !== 'test') {
            console.log(`[CSRF] 🛡️ Skipping CSRF check for authenticated request: ${path}`);
        } else {
            console.log(`[CSRF] 🛡️ Skipping CSRF check for path: ${path} (Method: ${req.method})`);
        }
        return next();
    }
    doubleSubmitCookieMiddleware(req, res, next);
});
app.use(csrfErrorHandler);

// 3. Standardize URL: Remove trailing slash
app.use((req, _res, next) => {
    if (req.url.length > 1 && req.url.endsWith('/')) {
        req.url = req.url.slice(0, -1);
    }
    next();
});

// 4. Logging — combined (Apache-style) in prod, dev format locally
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// 4. Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // scriptSrc intentionally strict: no 'unsafe-inline'. The SPA is served by Vercel,
            // not this Express server, so CSP here protects API error pages / dev surfaces only.
            scriptSrc: ["'self'"],
            // styleSrc keeps 'unsafe-inline' for Tailwind's inline runtime styles and dynamicallySetInnerHTML <style> blocks.
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://api.dicebear.com", "https://*.railway.app", "https://*.supabase.co"],
            connectSrc: ["'self'", "https://*.vercel.app", "https://*.railway.app", "https://*.supabase.co"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: IS_PROD ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.disable('x-powered-by');

// 5. Global Rate Limiting — tunable via env (defaults: 600 req / 15 min / IP)
const GLOBAL_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX || '600', 10);
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: GLOBAL_RATE_LIMIT,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => {
        if (!IS_PROD) return true;
        if (req.method === 'OPTIONS') return true;
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

// 8. 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: `Route ${req.originalUrl} does not exist on this server.` 
    });
});

// 8b. Sentry error capture (no-op unless SENTRY_DSN is set). Must come AFTER all
// routes and BEFORE our own error handler so it sees errors passed via next(err).
if (sentryEnabled) {
    Sentry.setupExpressErrorHandler(app);
}

// 9. Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || 500;
    console.error(`[Global Error] ${req.method} ${req.path} → ${status}: ${err.name}: ${err.message}`);
    if (!IS_PROD && err.stack) console.error(err.stack);

    // Don't leak internal error messages in production
    const message = IS_PROD && status >= 500
        ? 'An unexpected error occurred.'
        : (err.message || 'An unexpected error occurred.');

    res.status(status).json({
        error: err.name || 'Internal Server Error',
        message,
        path: req.path
    });
});

export { app };
