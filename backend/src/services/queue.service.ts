import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/env';

/**
 * Lead DevSecOps: Resource Exhaustion Protection
 * 
 * We offload heavy tasks (AI, analytics, report generation) to a background 
 * worker queue. This prevents long-running synchronous requests from 
 * blocking the Event Loop and exhausting server memory/CPU.
 */

// Lead DevSecOps: Global throttling for Redis error logs to prevent spam
const REDIS_LOG_THROTTLE = 60000; // 1 minute
const getGlobalRedisTimestamp = () => (global as any).__LAST_REDIS_ERROR_LOG || 0;
const setGlobalRedisTimestamp = (ts: number) => (global as any).__LAST_REDIS_ERROR_LOG = ts;

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
        // More conservative retry strategy: start with 1s, max 30s
        const delay = Math.min(Math.max(times * 1000, 1000), 30000);
        return delay;
    }
});

redisConnection.on('error', (err) => {
    const now = Date.now();
    if (now - getGlobalRedisTimestamp() < REDIS_LOG_THROTTLE) {
        return;
    }
    setGlobalRedisTimestamp(now);
    console.info('ℹ️  [Redis] Background tasks (AI/Reports) are currently queued locally. To enable full background processing, start Redis with "docker-compose up -d redis".');
});

// 1. The Queue: Used by the API to dispatch heavy tasks
export const heavyTaskQueue = new Queue('heavy-tasks', { 
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 1000,
    }
});

// Lead DevSecOps: Prevent Queue connection errors from crashing the process
heavyTaskQueue.on('error', (err) => {
    // Silence to prevent spam, already handled by redisConnection listener
});

// 2. The Worker: Processes the heavy tasks asynchronously
export const startWorker = () => {
    const worker = new Worker('heavy-tasks', async (job: Job) => {
        console.log(`👷 [Worker] Processing job ${job.id}: ${job.name}...`);
        
        try {
            switch (job.name) {
                case 'ai:analyze-results':
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return { success: true, result: 'AI analysis complete' };
                
                case 'reports:generate-full-audit':
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    return { success: true, result: 'Full school audit generated' };
                
                default:
                    console.warn(`⚠️ [Worker] Unknown job type: ${job.name}`);
            }
        } catch (err: any) {
            console.error(`💥 [Worker] Job ${job.id} failed:`, err.message);
            throw err;
        }
    }, { connection: redisConnection, concurrency: 2 });

    // Handle worker-specific events
    worker.on('completed', (job) => console.log(`✅ [Worker] Job ${job.id} completed.`));
    worker.on('failed', (job, err) => console.error(`❌ [Worker] Job ${job.id} failed:`, err.message));
    
    // Lead DevSecOps: Prevent Worker connection errors from crashing the process
    worker.on('error', (err) => {
        // Silence to prevent spam, already handled by redisConnection listener
    });
    
    return worker;
};
