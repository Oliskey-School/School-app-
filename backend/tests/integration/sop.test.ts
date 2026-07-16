/**
 * SCHOOL SOP (Standard Operating Procedures) — configurable incident workflow
 * engine (real database).
 *
 * Covers: building a multi-stage workflow, auto-cascade through no-requirement
 * stages on report, blocking at a requires-evidence/requires-decision stage,
 * evidence upload + explicit advance, decision recording (with auto-linked
 * suspension), letter draft → edit → send, critical-alert fan-out + audience
 * notification, permanent history (nothing deleted on deactivate), and access
 * control (teacher sees only their own cases; cross-school isolation).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'sop-school', B = 'sop-main';
const ADMIN = 'sop-admin', TCH_U = 'sop-tch-u', TCH2_U = 'sop-tch2-u', PARENT_U = 'sop-parent-u';
let studentId = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TCH_U, 'TEACHER', B);
const asTeacher2 = () => tok(TCH2_U, 'TEACHER', B);

async function cleanup() {
    // SOPWorkflowStage/SOPCaseStageLog have no school_id column of their own —
    // cascading FK deletes (via SOPIncidentType/SOPCase) handle them.
    for (const m of ['sOPLetter', 'sOPDecision', 'sOPEvidence', 'sOPCase', 'sOPIncidentType', 'studentSuspension', 'student', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('School SOP — incident workflow engine', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'SOP', code: 'SOP', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'SOPM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'sop-admin@x.com', password_hash: 'x', full_name: 'SOP Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        for (const [uid, name] of [[TCH_U, 'SOP Teacher'], [TCH2_U, 'SOP Teacher Two']] as const) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: 'TEACHER' as any, school_id: S, branch_id: B } });
        }
        await prisma.teacher.create({ data: { user_id: TCH_U, school_id: S, branch_id: B, full_name: 'SOP Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } });
        await prisma.teacher.create({ data: { user_id: TCH2_U, school_id: S, branch_id: B, full_name: 'SOP Teacher Two', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } });
        await prisma.user.create({ data: { id: PARENT_U, email: 'sop-parent@x.com', password_hash: 'x', full_name: 'SOP Parent', role: 'PARENT' as any, school_id: S, branch_id: B } });
        const studentUser = await prisma.user.create({ data: { id: 'sop-stu-u', email: 'sop-stu@x.com', password_hash: 'x', full_name: 'SOP Student', role: 'STUDENT' as any, school_id: S, branch_id: B } });
        studentId = (await prisma.student.create({ data: { user_id: studentUser.id, school_id: S, branch_id: B, full_name: 'SOP Student', grade: 7 } })).id;
    }, 60000);
    afterAll(cleanup, 60000);

    let bullyingTypeId = '';
    let caseId = '';

    it('admin builds a multi-stage incident type', async () => {
        const res = await request(app).post('/api/sop/incident-types')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({
                name: 'Bullying', description: 'Bullying incidents',
                stages: [
                    { name: 'VP Notified', notify_roles: ['ADMIN'] },
                    { name: 'Parent Notified', notify_roles: ['PARENT'] },
                    { name: 'Investigation', notify_roles: ['ADMIN'], requires_evidence: true },
                    { name: 'Decision Recorded', notify_roles: ['ADMIN'], requires_decision: true },
                    { name: 'Case Archived', notify_roles: [] },
                ],
            });
        expect(res.status).toBe(201);
        expect(res.body.stages.length).toBe(5);
        expect(res.body.stages[4].is_terminal).toBe(true);
        bullyingTypeId = res.body.id;
    });

    it('teachers cannot create incident types', async () => {
        const res = await request(app).post('/api/sop/incident-types')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ name: 'Hack', stages: [{ name: 'X' }] });
        expect(res.status).toBe(403);
    });

    it('reporting a case auto-cascades through no-requirement stages and stops at "Investigation"', async () => {
        const res = await request(app).post('/api/sop/cases')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({
                incident_type_id: bullyingTypeId,
                title: 'Playground incident', description: 'Student reported being teased repeatedly.',
                involved_student_ids: [studentId],
            });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('in_progress');
        expect(res.body.current_stage_order).toBe(3); // stopped at "Investigation"

        const logs = res.body.stage_logs.sort((a: any, b: any) => a.stage_order - b.stage_order);
        expect(logs[0].status).toBe('completed'); // VP Notified — auto
        expect(logs[1].status).toBe('completed'); // Parent Notified — auto
        expect(logs[2].status).toBe('pending');    // Investigation — blocked
        caseId = res.body.id;

        // VP (admin) should have been notified.
        const adminNotif = await prisma.notification.findFirst({ where: { school_id: S, user_id: ADMIN, title: { contains: 'VP Notified' } } });
        expect(adminNotif).toBeTruthy();
    });

    it('cannot advance past "Investigation" without evidence', async () => {
        const res = await request(app).post(`/api/sop/cases/${caseId}/advance`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/evidence/i);
    });

    it('uploading evidence then advancing moves the case to "Decision Recorded" (blocked again)', async () => {
        const ev = await request(app).post(`/api/sop/cases/${caseId}/evidence`)
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ url: '/uploads/evidence1.jpg', file_type: 'image/jpeg', description: 'Photo of the incident area' });
        expect(ev.status).toBe(201);

        const res = await request(app).post(`/api/sop/cases/${caseId}/advance`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ notes: 'Spoke with both students and a witness.' });
        expect(res.status).toBe(200);
        expect(res.body.current_stage_order).toBe(4); // Decision Recorded
        expect(res.body.status).toBe('in_progress');
    });

    it('cannot advance past "Decision Recorded" without a decision', async () => {
        const res = await request(app).post(`/api/sop/cases/${caseId}/advance`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/decision/i);
    });

    it('recording a suspension-outcome decision auto-links a real StudentSuspension', async () => {
        const res = await request(app).post(`/api/sop/cases/${caseId}/decision`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({
                decision_text: 'Confirmed bullying. Student suspended for one week.',
                outcome: 'suspension',
                student_id: studentId,
                suspension: { start_date: '2026-08-01', return_date: '2026-08-08', return_conditions: 'Meet with counselor.' },
            });
        expect(res.status).toBe(201);
        expect(res.body.linked_record_type).toBe('suspension');

        const suspension = await (prisma as any).studentSuspension.findUnique({ where: { id: res.body.linked_record_id } });
        expect(suspension).toBeTruthy();
        expect(suspension.student_id).toBe(studentId);
    });

    it('advancing after the decision reaches the terminal stage and archives the case', async () => {
        const res = await request(app).post(`/api/sop/cases/${caseId}/advance`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('archived');
        expect(res.body.closed_at).toBeTruthy();
    });

    it('an archived case cannot be advanced again', async () => {
        const res = await request(app).post(`/api/sop/cases/${caseId}/advance`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('generates a letter draft, edits it, and sends it — notifying the recipient', async () => {
        const draft = await request(app).post(`/api/sop/cases/${caseId}/letters`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ recipient_type: 'parent' });
        expect(draft.status).toBe(201);
        expect(draft.body.draft_text).toContain('Playground incident');

        const edited = await request(app).put(`/api/sop/letters/${draft.body.id}`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ draft_text: 'Edited formal letter text.', recipient_id: PARENT_U, recipient_type: 'parent' });
        expect(edited.status).toBe(200);
        expect(edited.body.draft_text).toBe('Edited formal letter text.');

        const sent = await request(app).post(`/api/sop/letters/${draft.body.id}/send`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({});
        expect(sent.status).toBe(200);
        expect(sent.body.status).toBe('sent');
        expect(sent.body.final_text).toBe('Edited formal letter text.');

        const parentNotif = await prisma.notification.findFirst({ where: { school_id: S, user_id: PARENT_U, title: { contains: 'Letter' } } });
        expect(parentNotif).toBeTruthy();
    });

    it('a sent letter cannot be sent again', async () => {
        const letters = await (prisma as any).sOPLetter.findMany({ where: { case_id: caseId } });
        const res = await request(app).post(`/api/sop/letters/${letters[0].id}/send`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('a critical incident type fans out an immediate alert on report', async () => {
        const fireType = await request(app).post('/api/sop/incident-types')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({
                name: 'Fire Emergency', is_critical_alert: true, alert_audience: 'staff',
                stages: [{ name: 'Emergency Services Notified', notify_roles: ['ADMIN'] }, { name: 'Report Filed', notify_roles: [] }],
            });
        expect(fireType.status).toBe(201);

        const res = await request(app).post('/api/sop/cases')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ incident_type_id: fireType.body.id, title: 'Smoke in kitchen', description: 'Smoke detected near the kitchen area.' });
        expect(res.status).toBe(201);
        expect(res.body.critical_alert_sent).toBe(true);
        expect(res.body.status).toBe('archived'); // both stages have no requirements — fully cascades

        const alertNotif = await prisma.notification.findFirst({ where: { school_id: S, user_id: ADMIN, title: { contains: 'Critical Incident' } } });
        expect(alertNotif).toBeTruthy();
    });

    it('deactivating an incident type keeps existing cases and history intact', async () => {
        const res = await request(app).delete(`/api/sop/incident-types/${bullyingTypeId}`)
            .set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.is_active).toBe(false);

        const stillThere = await request(app).get(`/api/sop/cases/${caseId}`)
            .set('Authorization', `Bearer ${asAdmin()}`);
        expect(stillThere.status).toBe(200);
        expect(stillThere.body.status).toBe('archived');
        expect(stillThere.body.stage_logs.length).toBe(5);
    });

    it('a teacher sees only cases they reported, not another teacher\'s', async () => {
        const mine = await request(app).get('/api/sop/cases').set('Authorization', `Bearer ${asTeacher()}`);
        expect(mine.status).toBe(200);
        expect(mine.body.some((c: any) => c.id === caseId)).toBe(true);

        const other = await request(app).get('/api/sop/cases').set('Authorization', `Bearer ${asTeacher2()}`);
        expect(other.body.some((c: any) => c.id === caseId)).toBe(false);

        const detailDenied = await request(app).get(`/api/sop/cases/${caseId}`).set('Authorization', `Bearer ${asTeacher2()}`);
        expect(detailDenied.status).toBe(403);
    });

    it('another school cannot see or report against these incident types/cases', async () => {
        await prisma.school.create({ data: { id: 'sop-other-school', name: 'SOP2', code: 'SOP2', slug: 'sop-other-school', plan_type: 'enterprise', subscription_status: 'active' } }).catch(() => {});
        await prisma.user.create({ data: { id: 'sop-foreign-admin', email: 'sop-foreign@x.com', password_hash: 'x', full_name: 'Foreign Admin', role: 'ADMIN' as any, school_id: 'sop-other-school', branch_id: null } }).catch(() => {});
        const foreignTok = jwt.sign(
            { id: 'sop-foreign-admin', email: 'sop-foreign@x.com', role: 'ADMIN', school_id: 'sop-other-school', branch_id: null, allowed_branch_ids: [] },
            config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

        const res = await request(app).get(`/api/sop/cases/${caseId}`).set('Authorization', `Bearer ${foreignTok}`);
        expect(res.status).toBe(404);

        await prisma.user.delete({ where: { id: 'sop-foreign-admin' } }).catch(() => {});
        await prisma.school.delete({ where: { id: 'sop-other-school' } }).catch(() => {});
    });
});
