import dotenv from 'dotenv';
import path from 'path';

const candidateEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
];

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

let loadedAny = false;
const seen = new Set<string>();
for (const p of candidateEnvPaths) {
    if (seen.has(p)) continue;
    seen.add(p);
    const result = dotenv.config({ path: p });
    if (!result.error) loadedAny = true;
}
if (loadedAny) {
    console.log('[EnvConfig] Successfully loaded .env variables');
} else if (!IS_PRODUCTION) {
    console.warn(`[EnvConfig] No .env file found in: ${candidateEnvPaths.join(', ')}`);
}

const DEFAULT_GOOGLE_CLIENT_ID = '1036010453198-q6c7pjf53uqus1j3o85bfud2gebe4rcu.apps.googleusercontent.com';

const DEV_FALLBACK_DEMO_SCHOOL_ID ='d0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
const DEV_FALLBACK_DEMO_BRANCH_ID = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

const resolvedDemoSchoolId = process.env.DEMO_SCHOOL_ID
    || process.env.DEFAULT_SCHOOL_ID
    || (IS_PRODUCTION ? '' : DEV_FALLBACK_DEMO_SCHOOL_ID);

const resolvedDemoBranchId = process.env.DEMO_BRANCH_ID
    || process.env.DEFAULT_BRANCH_ID
    || (IS_PRODUCTION ? '' : DEV_FALLBACK_DEMO_BRANCH_ID);

const developmentJwtSecret = 'fallback-dev-secret-do-not-use-in-prod';
const developmentRefreshSecret = 'fallback-refresh-secret-do-not-use-in-prod';
const developmentDatabaseUrl = 'postgresql://postgres:password123@127.0.0.1:5432/school_app';

export const config = {
    port: process.env.BACKEND_PORT || process.env.PORT || 5000,
    jwtSecret: process.env.JWT_SECRET || (IS_PRODUCTION ? '' : developmentJwtSecret),
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || (IS_PRODUCTION ? '' : developmentRefreshSecret),
    databaseUrl: process.env.DATABASE_URL || (IS_PRODUCTION ? '' : developmentDatabaseUrl),
    env: NODE_ENV,
    isProduction: IS_PRODUCTION,
    demoSchoolId: resolvedDemoSchoolId,
    demoBranchId: resolvedDemoBranchId,
    googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY
        || process.env.GOOGLE_API_KEY
        || process.env.GEMINI_API_KEY
        || '',
    // Google Gemini key — the FALLBACK chat provider (see aiGateway.service.ts)
    // and the game-question generator. Server-side only.
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    // NVIDIA NIM key (build.nvidia.com) powering the app's AI features via the
    // backend proxy. Server-side only — never exposed to the browser bundle.
    nvidiaApiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || '',
    nvidiaBaseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    nvidiaGenaiBaseUrl: process.env.NVIDIA_GENAI_BASE_URL || 'https://ai.api.nvidia.com/v1',
    // A public OAuth client ID, not a secret. The fallback is the same one the
    // frontend's Google button uses when VITE_GOOGLE_CLIENT_ID is unset
    // (components/auth/Login.tsx), so the token audience check still matches.
    googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
    dailyApiKey: process.env.DAILY_API_KEY || '',
};

export const DEMO_SCHOOL_ID = config.demoSchoolId;
export const DEMO_BRANCH_ID = config.demoBranchId;

if (IS_PRODUCTION) {
    const missing: string[] = [];
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.REFRESH_TOKEN_SECRET) missing.push('REFRESH_TOKEN_SECRET');
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!resolvedDemoSchoolId) missing.push('DEMO_SCHOOL_ID (or DEFAULT_SCHOOL_ID)');
    if (!resolvedDemoBranchId) missing.push('DEMO_BRANCH_ID (or DEFAULT_BRANCH_ID)');
    // Not fatal: a missing public client ID took the whole API down in
    // production (every route crashed at boot, so nobody could sign in at all).
    // The fallback above keeps Google sign-in matched to the frontend's button.
    if (!process.env.GOOGLE_CLIENT_ID && !process.env.VITE_GOOGLE_CLIENT_ID) {
        console.warn('[EnvConfig] GOOGLE_CLIENT_ID is not set; using the default public client ID shared with the frontend.');
    }
    // Without these, EmailService falls back to Ethereal — a public throwaway
    // mailbox — so verification codes, password resets and invitations never
    // reach the user. Fail at boot rather than at the first signup.
    if (!process.env.SMTP_USER) missing.push('SMTP_USER');
    if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
    // Prisma reads DIRECT_URL for migrations; unset, `migrate deploy` silently
    // runs through the pooled connection, which cannot execute DDL reliably.
    if (!process.env.DIRECT_URL) missing.push('DIRECT_URL');

    if (process.env.JWT_SECRET === developmentJwtSecret) {
        missing.push('JWT_SECRET (must not be the dev fallback)');
    }
    if (process.env.REFRESH_TOKEN_SECRET === developmentRefreshSecret) {
        missing.push('REFRESH_TOKEN_SECRET (must not be the dev fallback)');
    }
    if (process.env.DATABASE_URL === developmentDatabaseUrl) {
        missing.push('DATABASE_URL (must not be the local development fallback)');
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

if (!IS_PRODUCTION && config.jwtSecret === developmentJwtSecret) {
    console.warn('⚠️ [EnvConfig] Development JWT fallback is active. Never use this in production.');
}
