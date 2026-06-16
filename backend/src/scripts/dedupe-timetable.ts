/**
 * One-off cleanup: remove duplicate timetable lessons for the demo school.
 *
 * Repeated "Save" / "Generate" during testing left many duplicate rows (same class,
 * day, period and department). This keeps a single row per
 *   (branch, class, day, start_time, department-note)
 * — preferring a row that already has a teacher assigned, then the most recently
 * updated — and deletes the rest. A genuine SSS department split (same period, different
 * Science/Art/Commercial note) is preserved because the note is part of the key.
 *
 * Safe to re-run. Targets ONLY the demo school. Run with:
 *   npx tsx backend/src/scripts/dedupe-timetable.ts
 */
import prisma from '../config/database';

const DEMO_SCHOOL = process.env.DEMO_SCHOOL_ID || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

async function main() {
    const rows = await prisma.timetable.findMany({ where: { school_id: DEMO_SCHOOL } });
    // Prefer rows with a teacher assigned, then the newest.
    rows.sort((a, b) =>
        (Number(!!b.teacher_id) - Number(!!a.teacher_id)) ||
        (a.updated_at < b.updated_at ? 1 : -1));

    const kept = new Map<string, string>();
    const toDelete: string[] = [];
    for (const r of rows) {
        const key = [r.branch_id || '', r.class_id || r.class_name || '', r.day_of_week, r.start_time, r.notes || ''].join('|');
        if (kept.has(key)) toDelete.push(r.id);
        else kept.set(key, r.id);
    }

    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 500) {
        const res = await prisma.timetable.deleteMany({ where: { id: { in: toDelete.slice(i, i + 500) } } });
        deleted += res.count;
    }

    console.log(JSON.stringify({ totalRows: rows.length, keptUnique: kept.size, deleted }, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
