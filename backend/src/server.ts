import { app } from './app';
import http from 'http';
import { config } from './config/env';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const start = async () => {
    console.log('🏁 Starting School SaaS Backend...');
    
    let dbConnected = false;
    let retries = 5;
    
    while (retries > 0 && !dbConnected) {
        try {
            // Run migrations in production before ensuring demo data
            if (process.env.NODE_ENV === 'production') {
                try {
                    const { execSync } = require('child_process');
                    console.log('🔄 [Production] Verifying database migrations...');
                    execSync('npx prisma migrate deploy --schema=backend/prisma/schema.prisma', { stdio: 'inherit' });
                    console.log('✅ [Production] Database migrations up to date.');
                } catch (migrationErr: any) {
                    if (migrationErr.message?.includes('P3005')) {
                        console.error('❌ [Production] Migration Error P3005: The database is not empty but has no migration history.');
                        console.error('💡 [Resolution] Run: npx prisma migrate resolve --applied 20260317235016_init --applied 20260317235154_add_membership ...etc');
                    } else {
                        console.error('⚠️ [Production] Migration check skipped or failed:', migrationErr.message);
                    }
                }
            }

            const { DemoSeederService } = require('./services/demoSeeder.service');
            await DemoSeederService.ensureDemoData();
            dbConnected = true;
            console.log('✅ Database connected and demo data verified.');
        } catch (error: any) {
            retries--;
            const isStartingUp = error.message?.includes('the database system is starting up');
            
            if (isStartingUp) {
                console.log(`⏳ Database is still starting up... (${retries} retries left)`);
            } else {
                console.error('❌ Database connection error:', error.message);
            }
            
            if (retries === 0) {
                console.error('💥 Failed to connect to database after multiple attempts. Exiting.');
                process.exit(1);
            }
            
            await sleep(3000); // Wait 3 seconds before next retry
        }
    }

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

        // Keep process alive if it somehow loses handles (rare for Express but good practice)
        setInterval(() => {}, 1000 * 60 * 60);

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
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
// force restart - Antigravity triggered cleanup at 2026-04-14T13:07:42

