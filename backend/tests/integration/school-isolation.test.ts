/**
 * Cross-SCHOOL isolation regression test for the admin-hub leak: an admin must
 * never reach another school's data by passing ?schoolId=<other> in the query.
 * The endpoint must scope to the authenticated tenant (req.user.school_id).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { AuthService } from '../../src/services/auth.service';

const OTHER_SCHOOL = 'iso-test-other-school';
const OTHER_BRANCH = 'iso-test-other-branch';

describe('Cross-school isolation (admin-hub)', () => {
    let leakReportId: string;

    beforeAll(async () => {
        await prisma.school.upsert({
            where: { id: OTHER_SCHOOL },
            update: {},
            create: { id: OTHER_SCHOOL, name: 'Other School', code: 'OTHER', slug: 'other-iso', plan_type: 'free' },
        });
        const report: any = await prisma.savedReport.create({
            data: {
                school_id: OTHER_SCHOOL,
                name: '__SECRET_OTHER_SCHOOL_REPORT__',
                data_source: 'students',
                fields: ['name'],
            },
        });
        leakReportId = report.id;
    });

    afterAll(async () => {
        await prisma.savedReport.deleteMany({ where: { school_id: OTHER_SCHOOL } }).catch(() => {});
        await prisma.school.delete({ where: { id: OTHER_SCHOOL } }).catch(() => {});
    });

    it('does NOT return another school\'s reports even when its id is passed in the query', async () => {
        // A demo-school admin (their token => demo school) tries to read OTHER_SCHOOL.
        const admin = await AuthService.generateDemoToken('admin');
        const res = await request(app)
            .get(`/api/admin-hub/reports/saved?schoolId=${OTHER_SCHOOL}`)
            .set('Authorization', `Bearer ${admin.token}`);

        // Either outcome prevents the leak: the demo token is rejected outright (403,
        // "demo tokens can only access the demo school"), OR the controller ignores the
        // malicious schoolId and returns the caller's own (empty) reports (200). What
        // must NEVER happen is the other school's report leaking through.
        expect([200, 403]).toContain(res.status);
        const ids = (Array.isArray(res.body) ? res.body : []).map((r: any) => r.id);
        expect(ids).not.toContain(leakReportId);
    });
});
