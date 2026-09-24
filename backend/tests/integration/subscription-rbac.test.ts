import request from 'supertest';
import { app } from '../../src/app';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Regression gate: the subscription billing endpoints are admin-only.
 *
 * The /subscription router is mounted with `authenticate, requireTenant`, and
 * requireTenant only proves the caller belongs to a school — it checks no role.
 * That left POST /activate and POST /top-up writable by ANY authenticated member
 * of the school. The concrete exploit: a student posts
 * `{ plan_type: 'free', student_count: 0 }`, which short-circuits payment
 * verification entirely (activateSubscription: "Free plan: no Paystack
 * verification needed"), and the whole school is downgraded — plan_type,
 * subscription_status, term_amount and current_term rewritten, and `trial_used`
 * set to true so the free trial cannot be claimed again.
 *
 * If you are here because this test failed: do not relax it. A role guard that
 * protects the school's billing row was removed from subscription.routes.ts.
 */

const login = async (role: string): Promise<string> => {
    const res = await request(app).post('/api/auth/demo/login').send({ role });
    expect(res.status, `demo login failed for role=${role}`).toBe(200);
    return res.body.token;
};

describe('Subscription billing endpoints are admin-only', () => {
    let studentToken: string;
    let adminToken: string;

    beforeAll(async () => {
        studentToken = await login('student');
        adminToken = await login('admin');
    });

    it('a student cannot downgrade the school plan via POST /activate', async () => {
        // Deliberately a PAID plan with no payment reference, not the `free` payload
        // from the exploit. Both prove the point — the guard answers 403 before the
        // controller runs either way — but this one cannot corrupt data on the run
        // where it FAILS: without the guard it reaches activateSubscription and dies
        // on "reference is required for paid plans" (400), writing nothing. The
        // `free` payload was verified by hand to return 200 and actually perform the
        // downgrade when the guard is absent; a CI test should not do that.
        const res = await request(app)
            .post('/api/subscription/activate')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ plan_type: 'basic', student_count: 1 });

        expect(res.status, 'a student reached the school billing row').toBe(403);
    });

    it('a student cannot change the paid student count via POST /top-up', async () => {
        const res = await request(app)
            .post('/api/subscription/top-up')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ new_student_count: 0 });

        expect(res.status, 'a student reached the school billing row').toBe(403);
    });

    it('an admin is still allowed through the role guard', async () => {
        // Deliberately invalid input: this proves the request got PAST requireRole
        // (which would answer 403) and reached the controller's own validation,
        // without mutating the demo school's billing row the way a valid payload
        // would. 400 here means the guard admits admins; 403 would mean it
        // over-blocks the people the endpoint exists for.
        const res = await request(app)
            .post('/api/subscription/activate')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ plan_type: 'free', student_count: -1 });

        expect(res.status, 'the role guard is rejecting legitimate admins').not.toBe(403);
        expect(res.status).toBe(400);
    });

    it('per-user AI purchase stays open to a non-admin', async () => {
        // /user-ai acts on req.user.id, not on the school: it is how an individual
        // teacher or student buys AI for their OWN account on a Basic plan. It must
        // NOT be swept into the admin guard, or the feature disappears.
        const res = await request(app)
            .post('/api/subscription/user-ai')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({});

        expect(res.status, '/user-ai was wrongly restricted to admins').not.toBe(403);
    });
});
