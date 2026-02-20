import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    jwtSecret: process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    env: process.env.NODE_ENV || 'development'
};

if (!process.env.JWT_SECRET && config.env === 'production') {
    console.error('❌ FATAL: JWT_SECRET must be set in production!');
    process.exit(1);
}

if (config.jwtSecret === 'fallback-dev-secret-do-not-use-in-prod') {
    console.warn('⚠️  WARNING: Using fallback JWT secret. Security is compromised.');
}

if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.warn('⚠️  Supabase URL or Service Key missing. Realtime and DB features may fail.');
}
