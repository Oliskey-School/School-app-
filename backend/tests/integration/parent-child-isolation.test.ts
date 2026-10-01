/**
 * Parent / child isolation INSIDE one school.
 *
 * Cross-school isolation is covered elsewhere; this is the harder case that
 * RLS alone cannot answer, because both parents and both children belong to
 * the SAME school and branch — every row is legitimately visible to the tenant.
 * Only the parent↔child link may decide what Parent A can see, and that check
 * lives in application code, so it has to be tested endpoint by endpoint.
 *
 * Parent A has child A. Parent B has child B. Parent A attacks child B.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runAsPlatform } from '../../src/lib/tenantContext';

const MARK = 'OTHERCHILDSECRET';
const S = 'pci-school', B = 'pci-branch';
const PA_U = 'pci-parent-a-u', PB_U = 'pci-parent-b-u', SA_U = 'pci-stu-a-u', SB_U = 'pci-stu-b-u', ADMIN = 'pci-admin';
const ids: Record<string, string> = {};

const t = (p: any) => jwt.sign(p, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const parentA = () => ({ Authorization: `Bearer ${t({ id: PA_U, email: 'pci-pa@x.com', role: 'PARENT', school_id: S, branch_id: B, allowed_branch_ids: [B] })}` });
const parentB = () => ({ Authorization: `Bearer ${t({ id: PB_U, email: 'pci-pb@x.com', role: 'PARENT', school_id: S, branch_id: B, allowed_branch_ids: [B] })}` });
const studentA = () => ({ Authorization: `Bearer ${t({ id: SA_U, email: 'pci-sa@x.com', role: 'STUDENT', school_id: S, branch_id: B, allowed_branch_ids: [B] })}` });

async function wipe() {
    await runAsPlatform(async () => {
        for (const m of ['payment', 'studentFee', 'attendance', 'reportCard', 'assignment', 'parentChild', 'parent', 'student', 'class', 'user', 'branch'] as const) {
            await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: S } }).catch(() => {});
    });
}

describe('Parent / child isolation within a single school', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: S, name: 'PCI School', code: 'PCIS', slug: 'pci-school', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'PCIM', is_main: true } as any });
            const mk = (id: string, role: string, name: string) => prisma.user.create({ data: { id, email: `${id}@x.com`, password_hash: 'x', full_name: name, role: role as any, school_id: S, branch_id: B } as any });
            await mk(ADMIN, 'ADMIN', 'Admin');
            await mk(PA_U, 'PARENT', 'Parent A');
            await mk(PB_U, 'PARENT', 'Parent B');
            await mk(SA_U, 'STUDENT', 'Child A');
            await mk(SB_U, 'STUDENT', `Child B ${MARK}`);

            ids.parentA = (await prisma.parent.create({ data: { user_id: PA_U, school_id: S, branch_id: B, full_name: 'Parent A' } as any })).id;
            ids.parentB = (await prisma.parent.create({ data: { user_id: PB_U, school_id: S, branch_id: B, full_name: 'Parent B' } as any })).id;
            ids.childA = (await prisma.student.create({ data: { user_id: SA_U, school_id: S, branch_id: B, full_name: 'Child A', grade: 7, section: 'A', school_generated_id: 'PCIS_PCIM_STU_0001' } as any })).id;
            ids.childB = (await prisma.student.create({ data: { user_id: SB_U, school_id: S, branch_id: B, full_name: `Child B ${MARK}`, grade: 7, section: 'A', school_generated_id: 'PCIS_PCIM_STU_0002' } as any })).id;
            await prisma.parentChild.create({ data: { parent_id: ids.parentA, student_id: ids.childA, school_id: S, branch_id: B } as any });
            await prisma.parentChild.create({ data: { parent_id: ids.parentB, student_id: ids.childB, school_id: S, branch_id: B } as any });

            ids.class = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS 1', grade: 7, section: 'A' } as any })).id;
            ids.feeB = (await prisma.studentFee.create({ data: { school_id: S, branch_id: B, student_id: ids.childB, title: `Child B fee ${MARK}`, amount: 75000, due_date: new Date() } as any })).id;
            ids.cardB = (await prisma.reportCard.create({ data: { school_id: S, branch_id: B, student_id: ids.childB, session: '2026/2027', term: `Term ${MARK}` } as any })).id;
            await prisma.attendance.create({ data: { school_id: S, branch_id: B, student_id: ids.childB, class_id: ids.class, date: new Date('2026-05-05T00:00:00Z'), status: 'Absent', notes: `Child B absence ${MARK}` } as any }).catch(() => {});
            ids.feeA = (await prisma.studentFee.create({ data: { school_id: S, branch_id: B, student_id: ids.childA, title: 'Child A fee', amount: 1000, due_date: new Date() } as any })).id;
        });
    }, 180000);
    afterAll(wipe, 180000);

    const targets = () => [
        ['student profile', `/api/students/${ids.childB}`],
        ['attendance', `/api/attendance/student/${ids.childB}`],
        ['report card', `/api/report-cards/${ids.cardB}`],
        ['fee', `/api/fees/${ids.feeB}`],
        ['fee transactions', `/api/fees/${ids.feeB}/transactions`],
        ['id card', `/api/id-cards/student/${ids.childB}`],
        ['study plans', `/api/learning-hub/study-plans/${ids.childB}`],
        ['learning progress', `/api/learning-hub/progress/student/${ids.childB}`],
        ['bus', `/api/buses/student/${ids.childB}`],
        ['pickup persons', `/api/departures/students/${ids.childB}/pickup-persons`],
        ['alumni history', `/api/alumni/${ids.childB}/history`],
    ];

    it('Parent A cannot read anything belonging to another parent’s child', async () => {
        const leaks: string[] = [];
        for (const [label, url] of targets()) {
            const res = await request(app).get(url).set(parentA());
            const body = JSON.stringify(res.body ?? '');
            if (body.includes(MARK) || (res.status < 300 && body.includes(`"${ids.childB}"`))) {
                leaks.push(`${label} → ${res.status} ${body.slice(0, 140)}`);
            }
        }
        expect(leaks, `Parent A saw another parent's child:\n${leaks.join('\n')}`).toEqual([]);
    }, 180000);

    it('Parent A cannot pay, edit or attach anything to another parent’s child', async () => {
        const accepted: string[] = [];
        const writes: [string, 'post' | 'put', string, any][] = [
            ['pay child B fee', 'post', '/api/parents/me/payments', { fee_id: ids.feeB, student_id: ids.childB, reference: 'PCI-REF', gateway: 'paystack' }],
            ['link child B', 'post', '/api/parents/link-child', { parentId: ids.parentA, studentId: ids.childB }],
            ['edit child B', 'put', `/api/students/${ids.childB}`, { full_name: 'HIJACKED' }],
        ];
        for (const [label, method, url, body] of writes) {
            const res = await (request(app) as any)[method](url).set(parentA()).send(body);
            if (res.status >= 200 && res.status < 300) accepted.push(`${label} → ${res.status}`);
        }
        const [child, link, payments] = await runAsPlatform(() => Promise.all([
            prisma.student.findUnique({ where: { id: ids.childB } }),
            prisma.parentChild.findFirst({ where: { parent_id: ids.parentA, student_id: ids.childB, deleted_at: null } }),
            prisma.payment.count({ where: { school_id: S, student_id: ids.childB } }),
        ]));
        expect(accepted, `writes against another parent's child were accepted:\n${accepted.join('\n')}`).toEqual([]);
        expect(child?.full_name, 'child B was renamed by another parent').toContain(MARK);
        expect(link, 'Parent A linked themselves to another parent’s child').toBeNull();
        expect(payments, 'a payment was recorded against another parent’s child').toBe(0);
    }, 180000);

    it('Parent A’s own child list contains exactly their own child', async () => {
        const res = await request(app).get('/api/parents/me/children').set(parentA());
        expect(res.status, JSON.stringify(res.body).slice(0, 160)).toBe(200);
        const body = JSON.stringify(res.body);
        expect(body, 'another parent’s child appeared in the children list').not.toContain(MARK);
        expect(body, 'own child missing from the children list').toContain(ids.childA);
    }, 120000);

    it('Parent B still has full access to their own child (not a blanket deny)', async () => {
        const res = await request(app).get(`/api/students/${ids.childB}`).set(parentB());
        expect(res.status, JSON.stringify(res.body).slice(0, 160)).toBe(200);
        expect(JSON.stringify(res.body)).toContain(MARK);
    }, 120000);

    it('a student cannot read another student’s records', async () => {
        const leaks: string[] = [];
        for (const [label, url] of targets()) {
            const res = await request(app).get(url).set(studentA());
            const body = JSON.stringify(res.body ?? '');
            if (body.includes(MARK) || (res.status < 300 && body.includes(`"${ids.childB}"`))) {
                leaks.push(`${label} → ${res.status} ${body.slice(0, 140)}`);
            }
        }
        expect(leaks, `Student A saw another student's data:\n${leaks.join('\n')}`).toEqual([]);
    }, 180000);
});
