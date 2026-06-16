/**
 * One-off cleanup for the demo school's class records.
 *
 *  - De-duplicates classes within each branch by grade (the demo had e.g. Primary 3
 *    twice and Creche ×8). The "richest" class (most enrolments, then most timetable
 *    lessons, then oldest) is kept; timetable lessons and enrolments on the duplicates
 *    are repointed to the keeper, then the duplicate class is removed.
 *  - Ensures every demo branch that already has classes carries the full standard set
 *    (Creche → SSS 3) so the Timetable Builder shows the canonical columns.
 *
 * Safe to re-run (idempotent). Targets ONLY the demo school. Run with:
 *   npx tsx backend/src/scripts/cleanup-demo-classes.ts
 */
import prisma from '../config/database';

const DEMO_SCHOOL = process.env.DEMO_SCHOOL_ID || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

const CANON: { grade: number; name: string }[] = [
    { grade: -3, name: 'Creche' }, { grade: -2, name: 'Pre-Nursery' },
    { grade: -1, name: 'Nursery 1' }, { grade: 0, name: 'Nursery 2' },
    { grade: 1, name: 'Primary 1' }, { grade: 2, name: 'Primary 2' }, { grade: 3, name: 'Primary 3' },
    { grade: 4, name: 'Primary 4' }, { grade: 5, name: 'Primary 5' }, { grade: 6, name: 'Primary 6' },
    { grade: 7, name: 'JSS 1' }, { grade: 8, name: 'JSS 2' }, { grade: 9, name: 'JSS 3' },
    { grade: 10, name: 'SSS 1' }, { grade: 11, name: 'SSS 2' }, { grade: 12, name: 'SSS 3' },
];

async function main() {
    const classes = await prisma.class.findMany({ where: { school_id: DEMO_SCHOOL } });
    const byBranch: Record<string, any[]> = {};
    for (const c of classes) (byBranch[c.branch_id || 'null'] ||= []).push(c);

    let deduped = 0, created = 0, repointedTT = 0, repointedEnr = 0;

    for (const [branchKey, list] of Object.entries(byBranch)) {
        const branch_id = branchKey === 'null' ? null : branchKey;

        // --- de-duplicate by grade within this branch ---
        const byGrade: Record<string, any[]> = {};
        for (const c of list) (byGrade[String(c.grade)] ||= []).push(c);

        for (const group of Object.values(byGrade)) {
            if (group.length < 2) continue;
            const withCounts = await Promise.all(group.map(async (c) => ({
                c,
                en: await prisma.studentEnrollment.count({ where: { class_id: c.id } }),
                tt: await prisma.timetable.count({ where: { class_id: c.id } }),
            })));
            withCounts.sort((a, b) => (b.en - a.en) || (b.tt - a.tt)
                || (a.c.created_at < b.c.created_at ? -1 : 1));
            const keeper = withCounts[0].c;

            for (const { c: loser } of withCounts.slice(1)) {
                const r = await prisma.timetable.updateMany({ where: { class_id: loser.id }, data: { class_id: keeper.id } });
                repointedTT += r.count;

                // Repoint enrolments, honouring the (student_id, class_id) unique key.
                const enrolments = await prisma.studentEnrollment.findMany({ where: { class_id: loser.id } });
                for (const e of enrolments) {
                    const clash = await prisma.studentEnrollment.findFirst({ where: { class_id: keeper.id, student_id: e.student_id } });
                    if (clash) await prisma.studentEnrollment.delete({ where: { id: e.id } });
                    else { await prisma.studentEnrollment.update({ where: { id: e.id }, data: { class_id: keeper.id } }); repointedEnr++; }
                }

                await prisma.class.delete({ where: { id: loser.id } }); // cascades only the duplicate's leftover child rows
                deduped++;
            }
        }

        // --- ensure the standard set exists in this branch ---
        const present = new Set((await prisma.class.findMany({ where: { school_id: DEMO_SCHOOL, branch_id } })).map((c) => c.grade));
        for (const canon of CANON) {
            if (!present.has(canon.grade)) {
                await prisma.class.create({ data: { school_id: DEMO_SCHOOL, branch_id, name: canon.name, grade: canon.grade, section: 'A' } });
                created++;
            }
        }
    }

    console.log(JSON.stringify({ deduped, created, repointedTimetableRows: repointedTT, repointedEnrolments: repointedEnr }, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
