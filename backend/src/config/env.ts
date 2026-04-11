import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root directory
const envPath = path.resolve(process.cwd(), '.env');
console.log(`[EnvConfig] Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error(`[EnvConfig] Error loading .env:`, result.error);
} else {
    console.log(`[EnvConfig] Successfully loaded .env variables: ${Object.keys(result.parsed || {}).join(', ')}`);
}

export const config = {
    port: process.env.BACKEND_PORT || process.env.PORT || 5000,
    jwtSecret: process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password123@127.0.0.1:5432/school_app',
    env: process.env.NODE_ENV || 'development'
};

if (!process.env.JWT_SECRET && config.env === 'production') {
    console.error('❌ FATAL: JWT_SECRET must be set in production!');
    process.exit(1);
}

if (config.jwtSecret === 'fallback-dev-secret-do-not-use-in-prod') {
    console.warn('⚠️  WARNING: Using fallback JWT secret. Security is compromised.');
}

if (!config.databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set. Using local Docker PostgreSQL default.');
}
