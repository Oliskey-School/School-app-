import { app } from './app';
import { config } from './config/env';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const start = async () => {
    console.log('🏁 Starting School SaaS Backend...');
    
    let dbConnected = false;
    let retries = 5;
    
    while (retries > 0 && !dbConnected) {
        try {
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
        const httpServer = require('http').createServer(app);
        const { SocketService } = require('./services/socket.service');
        SocketService.init(httpServer);

        const server = httpServer.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port} in ${config.env} mode`);
            console.log(`📍 API Base URL: http://localhost:${config.port}/api`);
            console.log(`🔌 Real-time sync (Socket.io) enabled.`);
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
// force restart
