import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

if (result.error) {
    if (!IS_PRODUCTION) {
        console.warn(`[EnvConfig] Missed .env loading: ${result.error.message}`);
    }
} else {
    console.log(`[EnvConfig] Successfully loaded .env variables`);
}

// Demo school/branch IDs — accept canonical name DEMO_* with legacy fallback DEFAULT_*.
// In production these MUST be set explicitly; in development we keep a known fallback.
const DEV_FALLBACK_DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
const DEV_FALLBACK_DEMO_BRANCH_ID = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

const resolvedDemoSchoolId = process.env.DEMO_SCHOOL_ID
    || process.env.DEFAULT_SCHOOL_ID
    || (IS_PRODUCTION ? '' : DEV_FALLBACK_DEMO_SCHOOL_ID);

const resolvedDemoBranchId = process.env.DEMO_BRANCH_ID
    || process.env.DEFAULT_BRANCH_ID
    || (IS_PRODUCTION ? '' : DEV_FALLBACK_DEMO_BRANCH_ID);

export const config = {
    port: process.env.BACKEND_PORT || process.env.PORT || 5000,
    jwtSecret: process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'fallback-refresh-secret',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password123@127.0.0.1:5432/school_app',
    env: NODE_ENV,
    isProduction: IS_PRODUCTION,
    demoSchoolId: resolvedDemoSchoolId,
    demoBranchId: resolvedDemoBranchId,
    // Google Cloud Translation API key powering the whole-app auto-translation
    // layer. Server-side only — accepts the canonical name or a couple of common
    // aliases so existing deployments don't need to rename their secret.
    googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY
        || process.env.GOOGLE_API_KEY
        || process.env.GEMINI_API_KEY
        || ''
};

// Backward-compat constants
export const DEMO_SCHOOL_ID = config.demoSchoolId;
export const DEMO_BRANCH_ID = config.demoBranchId;

// Fail fast in production if critical secrets/IDs are missing.
if (IS_PRODUCTION) {
    const missing: string[] = [];
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.REFRESH_TOKEN_SECRET) missing.push('REFRESH_TOKEN_SECRET');
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!resolvedDemoSchoolId) missing.push('DEMO_SCHOOL_ID (or DEFAULT_SCHOOL_ID)');
    if (!resolvedDemoBranchId) missing.push('DEMO_BRANCH_ID (or DEFAULT_BRANCH_ID)');

    // Reject the literal dev-fallback strings even if they were somehow set in prod.
    if (process.env.JWT_SECRET === 'fallback-dev-secret-do-not-use-in-prod') {
        missing.push('JWT_SECRET (must not be the dev fallback)');
    }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        missing.push('JWT_SECRET (must be at least 32 characters)');
    }
    if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
        missing.push('REFRESH_TOKEN_SECRET (must be at least 32 characters)');
    }
    if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET === process.env.JWT_SECRET) {
        missing.push('REFRESH_TOKEN_SECRET (must differ from JWT_SECRET)');
    }

    if (missing.length > 0) {
        console.error(`❌ FATAL: Required production env vars missing/invalid: ${missing.join(', ')}`);
        process.exit(1);
    }
}

if (config.jwtSecret === 'fallback-dev-secret-do-not-use-in-prod') {
    console.warn('⚠️  WARNING: Using fallback JWT secret. Development only.');
}

if (!config.databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set. Using local Docker PostgreSQL default.');
}
