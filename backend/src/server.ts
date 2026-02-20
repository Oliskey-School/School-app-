import { app } from './app';
import { config } from './config/env';

const start = () => {
    try {
        app.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port} in ${config.env} mode`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

start();
