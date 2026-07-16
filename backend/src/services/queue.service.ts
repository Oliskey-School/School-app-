import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config/env';

/**
 * Lead DevSecOps: Resource Exhaustion Protection
 *
 * We offload heavy tasks (AI, analytics, report generation) to a background
 * worker queue. This prevents long-running synchronous requests from
 * blocking the Event Loop and exhausting server memory/CPU.
 *
 * Uses the shared Redis connection from config/redis.ts (its error/ready
 * logging is handled there — BullMQ transparently duplicates the connection
 * internally for blocking worker ops, so sharing one client here is safe).
 */

// 1. The Queue: Used by the API to dispatch heavy tasks
export const heavyTaskQueue = new Queue('heavy-tasks', {
    connection: redisConnection as any,
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
    }, { connection: redisConnection as any, concurrency: 2 });

    // Handle worker-specific events
    worker.on('completed', (job) => console.log(`✅ [Worker] Job ${job.id} completed.`));
    worker.on('failed', (job, err) => console.error(`❌ [Worker] Job ${job.id} failed:`, err.message));
    
    // Lead DevSecOps: Prevent Worker connection errors from crashing the process
    worker.on('error', (err) => {
        // Silence to prevent spam, already handled by redisConnection listener
    });
    
    return worker;
};
