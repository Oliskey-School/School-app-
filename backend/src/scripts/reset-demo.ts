/**
 * Reset the shared DEMO school to a clean baseline.
 *
 * Removes the accounts accumulated by visitors testing the demo (anything whose
 * email is NOT one of the standard @demo.com seed users), along with their
 * per-branch ID reservations. User deletes cascade to their teacher/parent/
 * student profiles and dependent rows (schema onDelete: Cascade), so the demo is
 * left with only its standard sample data.
 *
 * Run: npx tsx --tsconfig backend/tsconfig.json backend/src/scripts/reset-demo.ts
 */
import prisma from '../config/database';
import { config } from '../config/env';

const DEMO_SCHOOL_ID = config.demoSchoolId || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

async function resetDemo() {
    console.log(`🧹 Resetting demo school ${DEMO_SCHOOL_ID} to clean baseline...`);

    const targets = await prisma.user.findMany({
        where: { school_id: DEMO_SCHOOL_ID, NOT: { email: { contains: '@demo.com' } } },
        select: { id: true, email: true, role: true, school_generated_id: true },
    });
    console.log(`   Found ${targets.length} visitor-created account(s) to remove.`);
    if (targets.length === 0) {
        console.log('✅ Demo already clean.');
        return { removed: 0 };
    }

    const ids = targets.map(t => t.id);

    // Per-branch ID reservations (no cascade) — clear first.
    await prisma.$executeRawUnsafe(
        `DELETE FROM "BranchUserIdentity" WHERE user_id = ANY($1::text[])`, ids
    ).catch((e: any) => console.warn('   (BranchUserIdentity cleanup skipped:', e.message, ')'));

    // Deleting the users cascades to their role profiles + dependent records.
    const del = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`✅ Removed ${del.count} account(s) and their data. Demo is clean.`);
    return { removed: del.count };
}

// Allow both CLI execution and programmatic import (e.g. an admin endpoint / cron).
if (require.main === module) {
    resetDemo()
        .then(() => process.exit(0))
        .catch(e => { console.error('❌ Demo reset failed:', e.message); process.exit(1); });
}

export { resetDemo };
