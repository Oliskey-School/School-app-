import prisma from '../config/database';
import { RiskService } from './risk.service';

/**
 * Nightly Early Warning scan — same production-only-by-default pattern as
 * subscriptionCron.service.ts. Runs once per night for every active school;
 * an admin can also trigger a manual scan for their own school via
 * POST /api/risk/scan for testing/demo purposes.
 */
export async function runRiskScanForAllSchools() {
    console.log(`🕛 [RiskScanCron] Run at ${new Date().toISOString()}`);
    const schools = await prisma.school.findMany({ where: { subscription_status: { in: ['active', 'trial'] } }, select: { id: true } });
    for (const school of schools) {
        try {
            const result = await RiskService.runScanForSchool(school.id);
            if (result.flaggedCount > 0) console.log(`⚠️ [RiskScanCron] ${school.id}: ${result.flaggedCount} flagged / ${result.studentsScanned} scanned`);
        } catch (err: any) {
            console.warn(`⚠️ [RiskScanCron] scan failed for school ${school.id}:`, err.message);
        }
    }
    console.log('✅ [RiskScanCron] Done.');
}

export function startRiskScanCron() {
    const isProd = process.env.NODE_ENV === 'production';
    const force = process.env.RUN_RISK_SCAN_CRON === 'true';
    if (!isProd && !force) {
        console.log('🚫 [RiskScanCron] Skipped (not production). Set RUN_RISK_SCAN_CRON=true to enable.');
        return;
    }

    let cron: any;
    try {
        cron = require('node-cron');
    } catch {
        console.warn('⚠️ [RiskScanCron] node-cron not installed.');
        return;
    }

    // 01:00 Africa/Lagos — after the midnight subscription cron.
    cron.schedule('0 1 * * *', () => {
        runRiskScanForAllSchools().catch(e => console.error('[RiskScanCron] crashed:', e));
    }, { timezone: 'Africa/Lagos' });

    console.log('🕛 [RiskScanCron] Scheduled daily at 01:00 Africa/Lagos');
}
