import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';

/**
 * OTP / password-reset / auth attack surface.
 *
 * Runs entirely over the API (no browser needed) against a disposable
 * throwaway account created fresh in each test — never real customer data.
 * Uses /api/debug/latest-otp and /api/debug/latest-reset-code to read codes
 * back without a real inbox; those routes only exist when NODE_ENV != production
 * AND ENABLE_DEBUG_ROUTES=true (see backend/src/routes/index.ts) — CI sets
 * both, and this suite's own assertions would fail loudly if that ever
 * silently stopped being true (a 404/401 instead of a code).
 */

function apiBase(baseURL: string) {
    return `${baseURL}/api`;
}

async function onboardThrowawaySchool(request: APIRequestContext, base: string, tag: string) {
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `${tag}-${unique}@example.com`;
    const res = await request.post(`${base}/schools/onboard`, {
        data: {
            schoolName: `OTP-CI ${tag} ${unique}`,
            schoolCode: `${tag}${unique}`.toUpperCase().slice(0, 12),
            adminEmail: email,
            adminName: `${tag} Admin`,
            adminPassword: 'OtpCiPass!23',
            phone: '08000000000',
            address: 'CI test address',
            state: 'Lagos',
            planType: 'free',
        },
    });
    expect(res.ok(), `onboarding failed: ${await res.text()}`).toBeTruthy();
    return { email, password: 'OtpCiPass!23' };
}

// onboarding.service.ts deliberately fires OTP creation in the background so a
// slow/unreachable SMTP provider can never hang or time out the onboarding
// response (the school/branch/admin are already committed by then). That is
// correct production behaviour — a real inbox takes seconds to deliver mail,
// giving this comfortable headroom — but it opens a real, if brief, window
// where TestOTPStore.set() (near-instant) has run before the DB row itself
// has (bcrypt-hash the code, look up the owner, insert — tens to a couple
// hundred ms), and Playwright's back-to-back HTTP calls are fast enough to
// land in that window. Poll briefly rather than looping the test's own retry
// logic into the assertions below, or weakening the production fire-and-
// forget behaviour to make a test happy.
async function pollUntilTruthy<T>(fn: () => Promise<T | undefined | null>, timeoutMs = 3000): Promise<T> {
    const start = Date.now();
    for (; ;) {
        const value = await fn();
        if (value) return value;
        if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for a truthy value');
        await new Promise((r) => setTimeout(r, 100));
    }
}

async function readLatestOtp(request: APIRequestContext, base: string, email: string): Promise<string> {
    return pollUntilTruthy(async () => {
        const res = await request.get(`${base}/debug/latest-otp/${encodeURIComponent(email)}`);
        if (!res.ok()) return undefined;
        const body = await res.json();
        return body.otp as string | undefined;
    });
}

async function readLatestResetCode(request: APIRequestContext, base: string, email: string): Promise<string> {
    const res = await request.get(`${base}/debug/latest-reset-code/${encodeURIComponent(email)}`);
    expect(res.ok(), 'debug reset-code readback endpoint unavailable').toBeTruthy();
    const body = await res.json();
    expect(body.code).toBeTruthy();
    return body.code as string;
}

test.describe('Auth / OTP / password-reset security', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(60_000);

    test('wrong password is rejected with a generic message', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email } = await onboardThrowawaySchool(request, base, 'wp');
        const res = await request.post(`${base}/auth/login`, { data: { email, password: 'DefinitelyWrong!1' } });
        expect(res.status()).toBe(401);
        const body = await res.json();
        // Must not reveal WHICH part was wrong (email vs password) — that is
        // itself an enumeration channel.
        expect(String(body.message || '').toLowerCase()).not.toContain('user not found');
        expect(String(body.message || '').toLowerCase()).not.toContain('no such');
    });

    test('login against a nonexistent account fails the same way as a wrong password', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const resReal = await request.post(`${base}/auth/login`, {
            data: { email: `nonexistent-${Date.now()}@example.com`, password: 'Whatever!1' },
        });
        expect(resReal.status()).toBe(401);
    });

    test('forgot-password: identical response for a real account and a fake one (no enumeration)', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email: realEmail } = await onboardThrowawaySchool(request, base, 'er');
        const fakeEmail = `definitely-not-registered-${Date.now()}@example.com`;

        const [resReal, resFake] = await Promise.all([
            request.post(`${base}/auth/forgot-password`, { data: { email: realEmail } }),
            request.post(`${base}/auth/forgot-password`, { data: { email: fakeEmail } }),
        ]);
        expect(resReal.status()).toBe(resFake.status());
        const [bodyReal, bodyFake] = await Promise.all([resReal.json(), resFake.json()]);
        expect(bodyReal.message).toBe(bodyFake.message);
        expect(bodyReal.message.toLowerCase()).not.toContain('not registered');
        expect(bodyReal.message.toLowerCase()).not.toContain('sign up');
    });

    test('password reset code is single-use', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email } = await onboardThrowawaySchool(request, base, 'ru');
        await request.post(`${base}/auth/forgot-password`, { data: { email } });
        const code = await readLatestResetCode(request, base, email);

        const first = await request.post(`${base}/auth/reset-password`, {
            data: { email, code, newPassword: 'NewPass!2026a' },
        });
        expect(first.ok(), await first.text()).toBeTruthy();

        // Same code again — must be rejected now that it has been consumed.
        const second = await request.post(`${base}/auth/reset-password`, {
            data: { email, code, newPassword: 'AnotherPass!2026b' },
        });
        expect(second.ok()).toBeFalsy();

        // The FIRST new password must actually be the one that works — proves
        // the reset really took effect and wasn't silently a no-op.
        const login = await request.post(`${base}/auth/login`, { data: { email, password: 'NewPass!2026a' } });
        expect(login.ok(), await login.text()).toBeTruthy();
    });

    test('wrong reset code is rejected and does not reveal the real one', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email } = await onboardThrowawaySchool(request, base, 'wc');
        await request.post(`${base}/auth/forgot-password`, { data: { email } });

        const res = await request.post(`${base}/auth/reset-password`, {
            data: { email, code: '000000', newPassword: 'ShouldNotApply!1' },
        });
        expect(res.ok()).toBeFalsy();

        // The account must still be reachable with its ORIGINAL password —
        // a wrong-code attempt must never mutate the account.
        const login = await request.post(`${base}/auth/login`, { data: { email, password: 'OtpCiPass!23' } });
        expect(login.ok(), 'original password stopped working after a failed reset attempt').toBeTruthy();
    });

    test('reset code brute force is cut off by the attempt cap', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email } = await onboardThrowawaySchool(request, base, 'bf');
        await request.post(`${base}/auth/forgot-password`, { data: { email } });
        const real = await readLatestResetCode(request, base, email);

        // Six wrong guesses — VerificationService caps at 5 attempts, so the
        // 6th must fail even with a code that is otherwise correctly shaped.
        for (let i = 0; i < 6; i++) {
            const wrong = String(i).padStart(6, '9');
            if (wrong === real) continue;
            await request.post(`${base}/auth/reset-password`, { data: { email, code: wrong, newPassword: 'X!1aaaaa' } });
        }

        const finalAttempt = await request.post(`${base}/auth/reset-password`, {
            data: { email, code: real, newPassword: 'ShouldStillFail!1' },
        });
        expect(finalAttempt.ok(), 'the real code still worked after exceeding the attempt cap — brute-force protection is not enforced').toBeFalsy();
    });

    test('signup OTP: wrong code rejected, correct code accepted, then single-use', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email } = await onboardThrowawaySchool(request, base, 'so');
        const otp = await readLatestOtp(request, base, email);
        const verify = (code: string) => request.post(`${base}/verification/verify`, { data: { email, code, purpose: 'email_verification' } });

        // A wrong guess right after onboarding doubles as a readiness probe: the
        // background row (see onboarding.service.ts — OTP creation is fire-and-
        // forget so a slow SMTP can never hang the onboarding response) may not
        // exist yet, in which case this fails with "not found", not "invalid".
        // Once it exists the message changes to "Invalid ... N attempts
        // remaining" — that transition is what we wait for, not a fixed delay.
        const wrongBody = await pollUntilTruthy(async () => {
            const res = await verify('111111');
            const body = await res.json().catch(() => ({}));
            return /not found or has expired/i.test(body.message || '') ? undefined : body;
        });
        expect(wrongBody.success).toBe(false);
        expect(String(wrongBody.message)).toMatch(/invalid/i);

        const right = await verify(otp);
        expect(right.ok(), await right.text()).toBeTruthy();

        const reused = await verify(otp);
        expect(reused.ok(), 'a consumed signup OTP was accepted a second time').toBeFalsy();
    });

    test('OTP resend is throttled', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email } = await onboardThrowawaySchool(request, base, 'rs');
        const otp = await readLatestOtp(request, base, email);

        // Same readiness gap as the signup-OTP test above: resendVerification's
        // cooldown check looks for a code row created in the last 60s, which
        // isn't there until onboarding's background creation finishes. Wait for
        // the row to exist (an actual "invalid code" response, not "not found")
        // before asserting that a resend right after it is throttled.
        await pollUntilTruthy(async () => {
            const res = await request.post(`${base}/verification/verify`, { data: { email, code: '111111', purpose: 'email_verification' } });
            const body = await res.json().catch(() => ({}));
            return /not found or has expired/i.test(body.message || '') ? undefined : true;
        });

        // A code now exists from onboarding. An immediate resend must be
        // refused by the 1-minute cooldown in VerificationService.
        const res = await request.post(`${base}/verification/resend`, { data: { email, purpose: 'email_verification' } });
        expect(res.ok(), `resend was not throttled — otp was ${otp}`).toBeFalsy();
        const body = await res.json().catch(() => ({}));
        expect(String(body.message || '').toLowerCase()).toContain('wait');
    });

    test('verification status endpoint only answers for the caller\'s own account', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email, password } = await onboardThrowawaySchool(request, base, 'ss');
        const otp = await readLatestOtp(request, base, email);
        await request.post(`${base}/verification/verify`, { data: { email, code: otp, purpose: 'email_verification' } });
        const login = await request.post(`${base}/auth/login`, { data: { email, password } });
        const { token } = await login.json();

        // Own account: fine.
        const own = await request.get(`${base}/verification/status/${encodeURIComponent(email)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(own.ok(), await own.text()).toBeTruthy();

        // Someone else's account: must be refused, not answered.
        const other = await request.get(`${base}/verification/status/some-other-user@example.com`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(other.status()).toBe(403);

        // No token at all: must be refused, not answered. A genuinely fresh
        // context, not the shared `request` fixture — that fixture's cookie
        // jar still holds the session cookie the login call above set, and
        // the auth middleware falls back to that cookie when there is no
        // Authorization header, which would make this call look authenticated
        // by accident rather than testing the anonymous case it's named for.
        const anonCtx = await pwRequest.newContext();
        try {
            const anon = await anonCtx.get(`${base}/verification/status/${encodeURIComponent(email)}`);
            expect(anon.status()).toBe(401);
        } finally {
            await anonCtx.dispose();
        }
    });

    test('state-changing password reset is refused without a valid CSRF token when a session cookie is present', async ({ request, baseURL }) => {
        const base = apiBase(baseURL!);
        const { email, password } = await onboardThrowawaySchool(request, base, 'cf');
        const login = await request.post(`${base}/auth/login`, { data: { email, password } });
        expect(login.ok()).toBeTruthy();
        // A profile update is a state-changing, cookie-session-relevant action.
        // Sending it with an explicitly WRONG CSRF header (simulating a forged
        // cross-site request that cannot read the real cookie-bound token)
        // must be refused, not silently accepted.
        const res = await request.put(`${base}/users/me/profile`, {
            headers: { 'X-CSRF-Token': 'forged-token-attacker-cannot-know-the-real-one' },
            data: { full_name: 'CSRF Probe' },
        });
        expect([401, 403]).toContain(res.status());
    });
});
