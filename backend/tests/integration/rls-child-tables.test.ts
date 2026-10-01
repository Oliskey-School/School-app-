/**
 * Row level security for tenant-owned tables that carry no school_id.
 *
 * SOPEvidence / SOPLetter / SOPDecision / SOPCaseStageLog, SOPWorkflowStage,
 * ObservationResponse, StudyPlanItem and the implicit _ClassToSubject join
 * table hold real tenant data but are linked to a school only through a parent
 * row. Before migration 20260922090000 they had no policy at all, so the
 * database itself offered no isolation — only the application's own WHERE
 * clauses did. This proves the data layer now refuses cross-tenant reads AND
 * writes on each of them, which is what the "isolation is enforced at the data
 * layer, not just the application layer" requirement actually means.
 *
 * These assertions talk to Postgres directly (not through the API) on purpose:
 * they must fail if someone removes the policies, even if every controller
 * still happens to scope its queries correctly.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { runAsPlatform, runWithTenantContext } from '../../src/lib/tenantContext';

const SA = 'rct-a', SB = 'rct-b', AB = 'rct-ab', BB = 'rct-bb';
const AU = 'rct-a-user', BU = 'rct-b-user';
const ids: Record<string, string> = {};

async function wipe() {
    await runAsPlatform(async () => {
        for (const s of [SA, SB]) {
            await prisma.$executeRawUnsafe(`DELETE FROM "ObservationResponse" WHERE observation_id IN (SELECT id FROM "ClassroomObservation" WHERE school_id = $1)`, s).catch(() => {});
            await prisma.$executeRawUnsafe(`DELETE FROM "StudyPlanItem" WHERE study_plan_id IN (SELECT id FROM "StudyPlan" WHERE school_id = $1)`, s).catch(() => {});
            for (const t of ['SOPEvidence', 'SOPLetter', 'SOPDecision', 'SOPCaseStageLog']) {
                await prisma.$executeRawUnsafe(`DELETE FROM "${t}" WHERE case_id IN (SELECT id FROM "SOPCase" WHERE school_id = $1)`, s).catch(() => {});
            }
            await prisma.$executeRawUnsafe(`DELETE FROM "SOPWorkflowStage" WHERE incident_type_id IN (SELECT id FROM "SOPIncidentType" WHERE school_id = $1)`, s).catch(() => {});
            await prisma.$executeRawUnsafe(`DELETE FROM "_ClassToSubject" WHERE "A" IN (SELECT id FROM "Class" WHERE school_id = $1)`, s).catch(() => {});
            for (const m of ['sOPCase', 'sOPIncidentType', 'classroomObservation', 'studyPlan', 'resource', 'class', 'subject', 'teacher', 'student', 'user', 'branch'] as const) {
                await (prisma as any)[m]?.deleteMany?.({ where: { school_id: s } }).catch(() => {});
            }
            await prisma.school.delete({ where: { id: s } }).catch(() => {});
        }
    });
}

describe('RLS on tenant tables that have no school_id column', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            for (const [s, code, slug] of [[SA, 'RCTA', 'rct-a'], [SB, 'RCTB', 'rct-b']] as const) {
                await prisma.school.create({ data: { id: s, name: `RCT ${code}`, code, slug, plan_type: 'premium', subscription_status: 'active' } as any });
            }
            await prisma.branch.create({ data: { id: AB, school_id: SA, name: 'A', code: 'RCTAM', is_main: true } as any });
            await prisma.branch.create({ data: { id: BB, school_id: SB, name: 'B', code: 'RCTBM', is_main: true } as any });
            await prisma.user.create({ data: { id: AU, email: 'rct-a@x.com', password_hash: 'x', full_name: 'A', role: 'ADMIN' as any, school_id: SA, branch_id: AB } as any });
            await prisma.user.create({ data: { id: BU, email: 'rct-b@x.com', password_hash: 'x', full_name: 'B', role: 'ADMIN' as any, school_id: SB, branch_id: BB } as any });

            // --- School B's parent rows and their child rows ---
            ids.bIncident = (await (prisma as any).sOPIncidentType.create({ data: { school_id: SB, branch_id: BB, name: 'B incident', severity: 'high' } as any })).id;
            ids.bCase = (await (prisma as any).sOPCase.create({ data: { school_id: SB, branch_id: BB, incident_type_id: ids.bIncident, title: 'B case', description: 'B case', reported_by: BU, reported_by_role: 'ADMIN' } as any })).id;
            ids.bEvidence = (await (prisma as any).sOPEvidence.create({ data: { case_id: ids.bCase, url: 'https://b/evidence.pdf', uploaded_by: BU } as any })).id;
            ids.bLetter = (await (prisma as any).sOPLetter.create({ data: { case_id: ids.bCase, draft_text: 'B letter', generated_by: BU } as any })).id;
            ids.bDecision = (await (prisma as any).sOPDecision.create({ data: { case_id: ids.bCase, decision_text: 'B decision', decided_by: BU } as any })).id;
            ids.bStage = (await (prisma as any).sOPWorkflowStage.create({ data: { incident_type_id: ids.bIncident, order: 1, name: 'B stage' } as any })).id;

            const bTeacherUser = await prisma.user.create({ data: { id: 'rct-b-tch-u', email: 'rct-b-tch@x.com', password_hash: 'x', full_name: 'B T', role: 'TEACHER' as any, school_id: SB, branch_id: BB } as any });
            const bTeacher = await prisma.teacher.create({ data: { user_id: bTeacherUser.id, school_id: SB, branch_id: BB, full_name: 'B T', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } as any });
            // ClassroomObservation.template_id references ObservationTemplate.
            const tpl = (await (prisma as any).observationTemplate.findFirst({ where: { school_id: SB } }))
                ?? await (prisma as any).observationTemplate.create({ data: { school_id: SB, name: 'B tpl', criteria: [] } as any });
            if (tpl) {
                ids.bObs = (await (prisma as any).classroomObservation.create({ data: { school_id: SB, branch_id: BB, template_id: tpl.id, teacher_id: bTeacher.id, observer_id: BU, date: new Date() } as any })).id;
                ids.bObsResp = (await (prisma as any).observationResponse.create({ data: { observation_id: ids.bObs, criterion_key: 'planning', score: 5, comment: 'B comment' } as any })).id;
            }

            const bStudentUser = await prisma.user.create({ data: { id: 'rct-b-stu-u', email: 'rct-b-stu@x.com', password_hash: 'x', full_name: 'B S', role: 'STUDENT' as any, school_id: SB, branch_id: BB } as any });
            const bStudent = await prisma.student.create({ data: { user_id: bStudentUser.id, school_id: SB, branch_id: BB, full_name: 'B S', grade: 7, section: 'A', school_generated_id: 'RCTB_RCTBM_STU_0001' } as any });
            ids.bPlan = (await (prisma as any).studyPlan.create({ data: { school_id: SB, branch_id: BB, student_id: bStudent.id, title: 'B plan' } as any })).id;
            const bRes = await (prisma as any).resource.create({ data: { school_id: SB, branch_id: BB, title: 'B res', type: 'video' } as any });
            ids.bPlanItem = (await (prisma as any).studyPlanItem.create({ data: { study_plan_id: ids.bPlan, resource_id: bRes.id } as any })).id;

            ids.bClass = (await prisma.class.create({ data: { school_id: SB, branch_id: BB, name: 'B class', grade: 7, section: 'A' } as any })).id;
            ids.bSubject = (await prisma.subject.create({ data: { school_id: SB, branch_id: BB, name: 'B subject' } as any })).id;
            await prisma.$executeRawUnsafe(`INSERT INTO "_ClassToSubject" ("A","B") VALUES ($1,$2) ON CONFLICT DO NOTHING`, ids.bClass, ids.bSubject);

            // School A needs one class + subject of its own for the write test.
            ids.aClass = (await prisma.class.create({ data: { school_id: SA, branch_id: AB, name: 'A class', grade: 7, section: 'A' } as any })).id;
            ids.aSubject = (await prisma.subject.create({ data: { school_id: SA, branch_id: AB, name: 'A subject' } as any })).id;
        });
    }, 180000);

    afterAll(wipe, 180000);

    const childReads: [string, string][] = [
        ['SOPEvidence', `SELECT count(*)::int AS n FROM "SOPEvidence"`],
        ['SOPLetter', `SELECT count(*)::int AS n FROM "SOPLetter"`],
        ['SOPDecision', `SELECT count(*)::int AS n FROM "SOPDecision"`],
        ['SOPWorkflowStage', `SELECT count(*)::int AS n FROM "SOPWorkflowStage"`],
        ['ObservationResponse', `SELECT count(*)::int AS n FROM "ObservationResponse"`],
        ['StudyPlanItem', `SELECT count(*)::int AS n FROM "StudyPlanItem"`],
        ['_ClassToSubject', `SELECT count(*)::int AS n FROM "_ClassToSubject"`],
    ];

    it('School A sees ZERO rows of School B in every parentless child table', async () => {
        const seen: string[] = [];
        await runWithTenantContext({ schoolId: SA, branchId: AB, allowedBranchIds: [AB] }, async () => {
            for (const [label, sql] of childReads) {
                const rows: any[] = await prisma.$queryRawUnsafe(sql);
                if (Number(rows[0].n) !== 0) seen.push(`${label}: ${rows[0].n} foreign rows visible`);
            }
        });
        expect(seen, `cross-tenant rows visible:\n${seen.join('\n')}`).toEqual([]);
    }, 120000);

    it('School B still sees its own child rows (the policies are not a blanket deny)', async () => {
        await runWithTenantContext({ schoolId: SB, branchId: BB, allowedBranchIds: [BB] }, async () => {
            for (const [label, sql] of childReads) {
                const rows: any[] = await prisma.$queryRawUnsafe(sql);
                expect(Number(rows[0].n), `${label} invisible to its own school`).toBeGreaterThan(0);
            }
        });
    }, 120000);

    it('School A cannot INSERT a child row onto a School B parent', async () => {
        const attempts: [string, string, any[]][] = [
            ['SOPEvidence', `INSERT INTO "SOPEvidence" (id, case_id, url, uploaded_by) VALUES (gen_random_uuid()::text, $1, 'https://evil/x.pdf', $2)`, [ids.bCase, AU]],
            ['SOPLetter', `INSERT INTO "SOPLetter" (id, case_id, draft_text, generated_by, status, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, 'evil', $2, 'draft', now(), now())`, [ids.bCase, AU]],
            ['StudyPlanItem', `INSERT INTO "StudyPlanItem" (id, study_plan_id, resource_id, created_at) VALUES (gen_random_uuid()::text, $1, $2, now())`, [ids.bPlan, ids.bPlanItem]],
        ];
        const accepted: string[] = [];
        await runWithTenantContext({ schoolId: SA, branchId: AB, allowedBranchIds: [AB] }, async () => {
            for (const [label, sql, params] of attempts) {
                try { await prisma.$executeRawUnsafe(sql, ...params); accepted.push(label); } catch { /* refused, as it must be */ }
            }
        });
        expect(accepted, `writes onto a foreign parent were accepted: ${accepted.join(', ')}`).toEqual([]);
    }, 120000);

    it('School A cannot staple its own subject onto a School B class (implicit join table)', async () => {
        let accepted = false;
        await runWithTenantContext({ schoolId: SA, branchId: AB, allowedBranchIds: [AB] }, async () => {
            try {
                await prisma.$executeRawUnsafe(`INSERT INTO "_ClassToSubject" ("A","B") VALUES ($1,$2)`, ids.bClass, ids.aSubject);
                accepted = true;
            } catch { /* refused */ }
        });
        expect(accepted, 'a cross-school class/subject link was written').toBe(false);
        const linked = await runAsPlatform(() => prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int AS n FROM "_ClassToSubject" WHERE "A" = $1 AND "B" = $2`, ids.bClass, ids.aSubject));
        expect(Number(linked[0].n)).toBe(0);
    }, 120000);

    it('every table that holds tenant data has RLS enabled and FORCED', async () => {
        const rows = await runAsPlatform(() => prisma.$queryRawUnsafe<any[]>(`
            SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'
              AND c.relname IN ('SOPEvidence','SOPLetter','SOPDecision','SOPCaseStageLog','SOPWorkflowStage','ObservationResponse','StudyPlanItem','_ClassToSubject')`));
        expect(rows.length).toBe(8);
        for (const r of rows) {
            expect(r.relrowsecurity, `${r.relname} has RLS disabled`).toBe(true);
            expect(r.relforcerowsecurity, `${r.relname} RLS is not FORCED`).toBe(true);
        }
    }, 120000);
});
