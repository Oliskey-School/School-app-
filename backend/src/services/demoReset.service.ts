import path from 'path';
import prisma from '../config/database';
import { AuthService } from './auth.service';

let seedDemoSchool: any;
try {
    /**
     * Resolve the seed path dynamically based on the current working directory.
     * This handles cases where the app is running from src/ or dist/ in production.
     */
    const seedPath = path.resolve(process.cwd(), 'prisma/seed');
    seedDemoSchool = require(seedPath).seedDemoSchool;
} catch (err) {
    console.warn('⚠️ [DemoReset] Seed module not found via path.resolve. Sync may be incomplete.');
}

/**
 * DemoResetService - Periodically resets the demo environment to its original state.
 * ONLY runs in Production and NEVER on localhost databases.
 */
export class DemoResetService {
    private static INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    private static isRunning = false;

    /**
     * Initializes the reset timer.
     */
    static init() {
        if (this.isRunning) return;

        // Security Check 1: Must be production
        if (process.env.NODE_ENV !== 'production') {
            console.log('🛡️ [DemoReset] Service disabled: Not in production mode.');
            return;
        }

        // Security Check 2: Database URL must not be localhost
        const dbUrl = process.env.DATABASE_URL || '';
        if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
            console.log('🛡️ [DemoReset] Service disabled: Localhost database detected.');
            return;
        }

        console.log(`🕒 [DemoReset] Service initialized. Reset scheduled every 30 minutes.`);
        this.isRunning = true;

        setInterval(() => {
            this.executeReset();
        }, this.INTERVAL_MS);
    }

    /**
     * Performs the data wipe and re-seed for the demo school.
     */
    static async executeReset() {
        console.log('♻️ [DemoReset] Starting scheduled environment reset...');
        const demoSchoolId = AuthService.DEMO_SCHOOL_ID;

        try {
            await prisma.$transaction(async (tx) => {
                // Delete data linked to the demo school in reverse dependency order
                // Note: We avoid deleting the School itself to keep ID stability, 
                // but wipe its operational data.

                const where = { school_id: demoSchoolId };

                // Delete in order to respect dependencies or leverage cascade
                await tx.announcement.deleteMany({ where });
                await tx.exam.deleteMany({ where });
                await tx.fee.deleteMany({ where });
                await tx.payment.deleteMany({ where });
                await tx.healthLog.deleteMany({ where });
                await tx.behaviorNote.deleteMany({ where });
                await tx.transportRoute.deleteMany({ where });
                
                // Finally delete classes, which will cascade to Attendance and Assignment
                await tx.class.deleteMany({ where });

                // Lead DevSecOps: Cleanup stale virtual branches (IP-based sessions)
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                await tx.$executeRaw`
                    DELETE FROM "Branch" 
                    WHERE school_id = ${demoSchoolId} 
                    AND is_demo_virtual = true 
                    AND (last_active_at < ${oneDayAgo} OR last_active_at IS NULL)
                `;
            });

            console.log('🧹 [DemoReset] Workspace wiped. Re-seeding demo state...');
            
            // Re-run the demo-specific seeding
            await seedDemoSchool();

            console.log('✅ [DemoReset] Environment successfully restored to baseline.');
        } catch (error: any) {
            console.error('❌ [DemoReset] Reset failed:', error.message);
        }
    }
}
