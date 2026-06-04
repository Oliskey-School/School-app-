import './config/instrument'; // MUST be first — sets up Sentry before app/express load
import { app } from './app';
import http from 'http';
import { config } from './config/env';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const start = async () => {
    console.log('🏁 Starting School SaaS Backend...');
    
    // 1. Initialize and Start HTTP Server IMMEDIATELY
    // This ensures health checks pass and "Failed to fetch" errors are avoided even if DB is down.
    try {
        const httpServer = http.createServer((req, res) => {
            // raw log for Railway debugging
            console.log(`📡 [RAW-HTTP] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
            return app(req, res);
        });

        const { SocketService } = require('./services/socket.service');
        SocketService.init(httpServer);

        const server = httpServer.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port} in ${config.env} mode`);
            console.log(`📍 API Base URL: http://localhost:${config.port}/api`);
            console.log(`🔌 Real-time sync (Socket.io) enabled.`);

            // Lead DevSecOps: Start background task worker
            try {
                const { startWorker } = require('./services/queue.service');
                startWorker();
                console.log('👷 Background task worker initialized.');
            } catch (err) {
                console.warn('⚠️ [Worker] Could not initialize queue service:', err);
            }

            // Initialize Demo Reset Service (will only run in production)
            try {
                const { DemoResetService } = require('./services/demoReset.service');
                DemoResetService.init();
            } catch (err) {
                console.warn('⚠️ [DemoReset] Could not initialize reset service:', err);
            }
        });

        // Handle server errors (e.g. port already in use)
        server.on('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`💥 Port ${config.port} is already in use.`);
            } else {
                console.error('💥 Server error:', error);
            }
            process.exit(1);
        });

        // Graceful shutdown
        const shutdown = () => {
            console.log('🛑 Shutting down server...');
            server.close(() => {
                console.log('✅ Server closed.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('❌ Fatal error during server startup:', error);
        process.exit(1);
    }

    // 2. Background Database Initialization & Migrations
    // We run this without blocking the server thread.
    (async () => {
        let dbConnected = false;
        let retries = 20; // Increased retries for background mode
        
        while (retries > 0 && !dbConnected) {
            try {
                console.log(`📡 [Maintenance] Attempting database connection... (${retries} attempts remaining)`);
                
                // Run migrations in production
                if (process.env.NODE_ENV === 'production') {
                    try {
                        const { execSync } = require('child_process');
                        console.log('🔄 [Production] Verifying database migrations...');
                        
                        // Use DIRECT_URL for migrations if available (session mode required)
                        const migrationDbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
                        const envWithDirect = { ...process.env, DATABASE_URL: migrationDbUrl };
                        
                        execSync('npx prisma migrate deploy --schema=backend/prisma/schema.prisma', { 
                            stdio: 'inherit',
                            env: envWithDirect
                        });
                        console.log('✅ [Production] Database migrations up to date.');
                    } catch (migrationErr: any) {
                        console.error('⚠️ [Production] Migration failed or skipped:', migrationErr.message);
                        console.log('   💡 Advice: Check if DIRECT_URL is set in Railway. Continuing to seeder...');
                    }
                }

                const shouldSeedDemo = process.env.NODE_ENV !== 'production'
                    || process.env.RUN_DEMO_SEEDER === 'true';
                if (shouldSeedDemo) {
                    const { DemoSeederService } = require('./services/demoSeeder.service');
                    await DemoSeederService.ensureDemoData();
                    console.log('✅ [Database] Connected and demo data verified.');
                } else {
                    console.log('🚫 [Database] Connected. Demo seeder skipped (production mode). Set RUN_DEMO_SEEDER=true to override.');
                }

                // Always seed the academic calendar — tiny table, runs once.
                try {
                    const { seedAcademicCalendarIfEmpty } = require('./services/term.service');
                    await seedAcademicCalendarIfEmpty();
                } catch (calErr: any) {
                    console.warn('⚠️ [TermService] Calendar seed skipped:', calErr.message);
                }

                // Subscription cron — production-only by default.
                try {
                    const { startSubscriptionCron } = require('./services/subscriptionCron.service');
                    startSubscriptionCron();
                } catch (cronErr: any) {
                    console.warn('⚠️ [SubscriptionCron] start skipped:', cronErr.message);
                }
                dbConnected = true;
            } catch (error: any) {
                retries--;
                console.error('❌ [Database] Connection error:', error.message);
                
                if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
                    console.error('========================================================================');
                    console.error('   💡 DIAGNOSTIC: Database connection succeeded, but tables are missing!');
                    console.error('   👉 ACTION REQUIRED: Initialize your local database schema by running:');
                    console.error('      npm run db:push');
                    console.error('      (or: npx prisma db push --schema=backend/prisma/schema.prisma)');
                    console.error('========================================================================');
                } else if (error.message?.includes('P1001')) {
                    console.error('   💡 Diagnostic: Database host is unreachable. Check if local database is running or if firewall blocks port 5432.');
                }

                if (retries === 0) {
                    console.error('💥 [Database] Max retries reached. Backend will stay alive but features requiring DB will fail.');
                    return;
                }
                
                await sleep(5000); // Wait 5 seconds before next retry
            }
        }
    })();

    // Keep process alive
    setInterval(() => {}, 1000 * 60 * 60);
};

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
    process.exit(1);
});

start();
// force restart - Antigravity triggered cleanup at 2026-04-28T12:15:00

