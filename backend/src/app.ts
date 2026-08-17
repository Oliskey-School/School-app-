
import './config/env';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { doubleSubmitCookieMiddleware, csrfErrorHandler, ensureCsrfCookie } from './middleware/csrf.middleware';
import { globalApiLimiter } from './middleware/rateLimiters';
import { Sentry, sentryEnabled } from './config/instrument';
import routes from './routes';

const app = express();

// Trust reverse proxy for rate limiting & accurate client IPs. Behind a WAF +
// load balancer there can be several hops — set TRUST_PROXY to the hop count
// (e.g. 2 for WAF→LB) so req.ip is the REAL client and rate-limits/WAF logging
// aren't fooled. Defaults to 1.
app.set('trust proxy', Number.isFinite(Number(process.env.TRUST_PROXY)) ? Number(process.env.TRUST_PROXY) : 1);

// Gzip responses — smaller payloads = faster TTFB and less work per node, which
// makes horizontal scaling / load balancing cheaper. Honour `x-no-compression`
// (e.g. for streaming) and skip already-tiny bodies (compression's own default).
app.use(compression({
    filter: (req, res) => (req.headers['x-no-compression'] ? false : compression.filter(req, res)),
}));

// Identify our own traffic so a WAF can allow-list it and cut false positives on
// legitimate API calls (large base64 photo uploads, JSON with rich text, etc.).
app.use((_req, res, next) => { res.setHeader('X-App', 'oliskey-api'); next(); });

const IS_PROD = process.env.NODE_ENV === 'production';

// 1. CORS
// In PRODUCTION, CORS is terminated at the reverse proxy (nginx) and the backend is
// reached same-origin, so it adds no Access-Control-* headers of its own.
//
// In DEVELOPMENT, the Vite dev server (http://localhost:3000) calls the API on
// http://localhost:5000 cross-origin, so the browser requires CORS headers or it
// blocks the request after the preflight (this is what broke local login). We
// reflect the request origin with credentials for dev only.
//
// Force-enable in any environment by setting ENABLE_CORS=true (e.g. if you ever run
// the API cross-origin without a proxy).
if (!IS_PROD || process.env.ENABLE_CORS === 'true') {
    app.use(cors({
        origin: true, // reflect the request origin
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'X-Branch-Id', 'x-branch-id', 'Accept', 'X-Requested-With', 'application-id', 'X-CSRF-Token'],
        exposedHeaders: ['X-CSRF-Token'],
        credentials: true,
        maxAge: 86400,
    }));
}

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

// CSRF token is delivered as a readable cookie (XSRF-TOKEN) on the first
// response — the SPA reads it directly instead of calling an endpoint.
app.use(ensureCsrfCookie);

// Lead DevSecOps: Apply Anti-CSRF protection globally, except for refresh endpoint
// to handle cross-site cookie blocking on mobile browsers.
app.use((req, res, next) => {
    const path = req.originalUrl || req.path;
    const isAuthAction = path.includes('/api/auth/refresh') ||
                        path.includes('/api/auth/logout') ||
                        path.includes('/api/auth/csrf-token') ||
                        path.includes('/api/auth/login') ||
                        path.includes('/api/auth/demo/login') ||
                        path.includes('/api/auth/google-login') ||
                        // Pre-auth flows: user has no session/token yet
                        path.includes('/api/auth/forgot-password') ||
                        path.includes('/api/auth/reset-password') ||
                        path.includes('/api/auth/signup') ||
                        // Public school registration — no session exists yet
                        path.includes('/api/schools/onboard') ||
                        path.includes('/api/schools') && req.method === 'POST' ||
                        // Email verification during signup — user has no token yet
                        path.includes('/api/verification/verify') ||
                        path.includes('/api/verification/resend') ||
                        // Public, non-mutating UI translation. Must work before login
                        // (demo/login screens) where no auth header or CSRF cookie exists.
                        path.includes('/api/translate');

    // Lead DevSecOps: If the request has a valid Authorization header, skip CSRF.
    // Bearer tokens are added manually via JS and are not automatically sent by browsers
    // during cross-origin form submissions, making them inherently resistant to CSRF.
    // This fix is crucial for mobile users where third-party cookies (psid-csrf) are often blocked.
    if (isAuthAction || req.headers.authorization || process.env.NODE_ENV === 'test') {
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
//
// We split security headers into TWO chains so that static assets stay cacheable:
//
//  • DYNAMIC chain (API + rendered HTML): a FRESH per-request CSP nonce is minted
//    and exposed on res.locals.cspNonce, so any inline <script> can carry it and
//    run under a strict CSP without 'unsafe-inline'. Because the nonce changes
//    every request, these responses must NOT be cached by a CDN — which is correct
//    for API JSON anyway.
//
//  • STATIC chain (/uploads): a STABLE, nonce-free CSP so the exact same bytes are
//    returned every time and an upstream cache/CDN can store them. (The SPA itself
//    is served by the reverse proxy / static host — see deploy/nginx.conf.)

// Shared CSP directive sources (everything except the script nonce, which differs per chain).
const baseCspDirectives: Record<string, any> = {
    defaultSrc: ["'self'"],
    // Tailwind runtime + injected <style> blocks need inline styles + Google Fonts.
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https://api.dicebear.com", "https://cdn-icons-png.flaticon.com"],
    // *.daily.co (+ wss) powers the embedded live-class video call; Daily's
    // media/signaling run over WebSocket, so both schemes must be allowed.
    connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://api.paystack.co", "https://*.ingest.sentry.io", "https://*.daily.co", "wss://*.daily.co"],
    mediaSrc: ["'self'", "blob:", "https://*.daily.co"],
    // Payment widgets + Learning Hub OER content render in iframes. The Learning
    // Hub domains here MUST match deploy/nginx.conf's frame-src (that's what
    // actually governs the live SPA shell) — kept in sync so a resource that
    // passes LearningHubResourceViewer's embeddable check never gets silently
    // blocked by our own CSP instead of genuinely trying to load.
    // TODO if you self-host Jitsi (see deploy/jitsi/README.md): add your Jitsi
    // domain here too (e.g. "https://meet.yourschooldomain.com") — the embedded
    // video call is an iframe, same as the Learning Hub resources above.
    frameSrc: ["'self'", "https://js.paystack.co", "https://checkout.flutterwave.com", "https://phet.colorado.edu", "https://www.adaptedmind.com", "https://scratch.mit.edu", "https://www.youtube.com", "https://www.geogebra.org", "https://www.desmos.com", "https://www.mathsisfun.com", "https://www.shodor.org", "https://blockly.games", "https://code.org", "https://kids.nationalgeographic.com", "https://www.commonlit.org", "https://www.gutenberg.org", "https://www.khanacademy.org", "https://openstax.org", "https://*.daily.co"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: IS_PROD ? [] : null,
};

// DYNAMIC: nonce minted per request, strict (no 'unsafe-inline' on scripts).
const dynamicSecurity = helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            ...baseCspDirectives,
            scriptSrc: ["'self'", (_req, res: any) => `'nonce-${res.locals.cspNonce}'`],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// STATIC: no nonce → identical bytes every time → cacheable by CDN/browser.
const staticSecurity = helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            ...baseCspDirectives,
            // Uploads are images/files only — never execute scripts from this origin.
            scriptSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Apply the DYNAMIC chain to everything EXCEPT /uploads (which gets the static chain
// at its own mount below). Mint the nonce just before, only on the dynamic path.
app.use((req, res, next) => {
    if (req.path.startsWith('/uploads')) return next();
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    return dynamicSecurity(req, res, next);
});
app.disable('x-powered-by');

// 5. Global Rate Limiting — Redis-backed, tiered (see middleware/rateLimiters.ts).
// Budgeted for a sustained ~30 req/s per shared IP (whole schools often sit
// behind ONE NAT IP — labs, staff rooms and phones on the school Wi-Fi share
// it) and ~60 req/s per authenticated user, both tunable via env
// (RATE_LIMIT_MAX / RATE_LIMIT_USER_MAX / RATE_LIMIT_WINDOW_MS). Counts live
// in Redis so they survive restarts and stay consistent across instances;
// falls back to fail-open if Redis is unreachable (see rateLimiters.ts).
app.use('/api', globalApiLimiter);

// 6. Basic root check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS Backend' });
});

// NOTE: the public `/health` ping endpoint was removed. The frontend no longer
// polls it for a connectivity indicator (it relies on the browser's own online/
// offline signal), which also stops the every-30s log noise / WAF false positives.
// Orchestrator liveness/readiness still use the dedicated /live and /ready probes below.

// Load-balancer / orchestrator probes. Unauthenticated, dependency-free and fast
// so a WAF/LB can allow-list them and pull unhealthy nodes quickly.
//  - /live  : the process is up (liveness). Never touches the DB.
//  - /ready : the node can serve traffic (readiness). Quick DB ping.
app.get('/live', (_req, res) => { res.status(200).json({ status: 'live' }); });
app.get('/ready', async (_req, res) => {
    try {
        const { default: prisma } = await import('./config/database');
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ready' });
    } catch {
        res.status(503).json({ status: 'not-ready' });
    }
});

// Static uploads: stable (nonce-free) CSP + long cache so a CDN/browser can store them.
app.use('/uploads', staticSecurity, express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '7d',
    etag: true,
}));


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
    // The stack trace never reaches the client response below (production
    // hides err.message too for 5xx) but it must always reach the SERVER
    // log — this used to be gated to dev-only, which meant a production
    // error's stack went nowhere unless SENTRY_DSN happened to be set.
    if (err.stack) console.error(err.stack);

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
