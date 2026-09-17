import prisma from '../config/database';
import { AuthService } from './auth.service';
import { DemoSeederService } from './demoSeeder.service';

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

        console.log(`🕒 [DemoReset] Service initialized. Reset scheduled every 24 hours.`);
        this.isRunning = true;

        // setInterval only starts counting from THIS process's own boot, not
        // from wall-clock time — if the app redeploys more often than every 24
        // hours (routine for this project), the timer restarts every time and
        // can go a very long time without ever actually firing. Running once
        // shortly after boot guarantees every deploy also scrubs whatever a
        // demo visitor has typed into the shared sandbox since the last one,
        // instead of relying on 24 hours of uninterrupted uptime that may
        // never happen. DemoSeederService.ensureDemoData() already runs at
        // startup and is safe to run again right after this.
        setTimeout(() => this.executeReset(), 60 * 1000);

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

                // The demo is explicitly "fully interactive" — a visitor can create
                // real Student/Teacher/Parent people, not just edit transactional
                // data, and whatever name/phone/email they type in stays visible to
                // every subsequent visitor forever, since nothing above ever deleted
                // a User. Every account DemoSeederService actually seeds uses a fixed
                // "*@demo.com" address (see seedBranchData), so anything else in this
                // school is visitor-created — delete it. Student/Teacher/Parent
                // profiles cascade via their User relation (onDelete: Cascade), so
                // deleting the User is enough for those — but BranchUserIdentity's
                // user_id has no cascade (see backend/src/scripts/reset-demo.ts,
                // which hit this same constraint first), so it must be cleared
                // first or the delete below fails with a foreign key violation.
                // Two other tables use ON DELETE RESTRICT (not SET NULL/CASCADE like
                // everything else that references User/Teacher) and will block the
                // delete below outright: GameScore.player_id -> User, and
                // EducationalGame.teacher_id -> Teacher. Verified against
                // pg_constraint directly (information_schema's view of this was
                // unreliable) rather than assumed — every other FK referencing
                // User/Student/Teacher/Parent is SET NULL and needs no handling.
                const visitorUsers = await tx.user.findMany({
                    where: { school_id: demoSchoolId, email: { not: { endsWith: '@demo.com' } } },
                    select: { id: true, teacher_profile: { select: { id: true } } }
                });
                const visitorUserIds = visitorUsers.map(u => u.id);
                const visitorTeacherProfileIds = visitorUsers
                    .map(u => u.teacher_profile?.id)
                    .filter((id): id is string => !!id);

                if (visitorUserIds.length > 0) {
                    await tx.$executeRaw`
                        DELETE FROM "BranchUserIdentity" WHERE user_id = ANY(${visitorUserIds})
                    `;
                    await tx.$executeRaw`
                        DELETE FROM "GameScore" WHERE player_id = ANY(${visitorUserIds})
                    `;
                    if (visitorTeacherProfileIds.length > 0) {
                        await tx.$executeRaw`
                            DELETE FROM "EducationalGame" WHERE teacher_id = ANY(${visitorTeacherProfileIds})
                        `;
                    }
                    await tx.user.deleteMany({ where: { id: { in: visitorUserIds } } });
                }

                // Same reasoning for branches: a demo admin can create a real,
                // permanent-looking branch (name, address, phone) through the normal
                // "Manage Branches" screen, not just the per-visitor virtual sandbox
                // this used to be scoped to (is_demo_virtual = true). Keep only the
                // two canonical branches DemoSeederService.ensureDemoData() re-seeds
                // (GLOBAL and MAIN) and delete every other branch in the school,
                // regardless of how it was created.
                await tx.$executeRaw`
                    DELETE FROM "Branch"
                    WHERE school_id = ${demoSchoolId}
                    AND code NOT IN ('GLOBAL', 'MAIN')
                `;

                // Cleanup stale demo login sessions. The demo school is shared by every
                // visitor, so its UserSession table grows unbounded (each "Try Demo"
                // click creates a new row that nothing ever expired). Left unchecked this
                // makes the Session Management screen list hundreds of rows, which is
                // both unusable and was the trigger for a self-revoke logout bug there.
                const staleSessionCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
                await (tx as any).userSession.deleteMany({
                    where: { school_id: demoSchoolId, last_active: { lt: staleSessionCutoff } }
                });
            });

            console.log('🧹 [DemoReset] Workspace wiped. Re-seeding demo state...');

            // Re-run the demo-specific seeding. This used to require() a
            // 'prisma/seed' module that does not exist anywhere in this repo — the
            // require failed silently at import time (caught, logged as a warning)
            // and `seedDemoSchool` stayed undefined, so this call threw EVERY time
            // the wipe above actually ran, leaving the demo blank until the next
            // full server restart happened to re-seed it via startup instead.
            // DemoSeederService.ensureDemoData() is the real, working seeder —
            // already proven safe to re-run repeatedly (server.ts calls it on
            // every boot).
            await DemoSeederService.ensureDemoData();

            console.log('✅ [DemoReset] Environment successfully restored to baseline.');
        } catch (error: any) {
            console.error('❌ [DemoReset] Reset failed:', error.message);
        }
    }
}
