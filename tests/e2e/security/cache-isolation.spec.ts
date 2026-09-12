import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * Client-side cache isolation across a tenant switch on the SAME browser
 * profile — the scenario a shared front-desk device actually hits: School A's
 * admin logs out, School B's admin logs in on the same machine seconds later.
 *
 * signOut() (AuthContext.tsx) clears the in-memory React Query cache, but that
 * cache is also persisted to IndexedDB (index.tsx's PersistQueryClientProvider
 * + idbPersister) with a 24h gcTime — a plain queryClient.clear() leaves the
 * persisted snapshot untouched, and the NEXT sign-in's restoreClient() would
 * rehydrate it. This suite drives two REAL onboarded schools through the
 * actual browser (not just asserting cleared storage) so both the client-side
 * fix and the server continuing to answer B-scoped requests are covered.
 */

function apiBase(baseURL: string) {
    return `${baseURL}/api`;
}

async function onboardThrowawaySchool(request: APIRequestContext, base: string, tag: string) {
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `${tag}-${unique}@example.com`;
    const schoolName = `CacheCI ${tag} ${unique}`;
    const res = await request.post(`${base}/schools/onboard`, {
        data: {
            schoolName,
            schoolCode: `${tag}${unique}`.toUpperCase().slice(0, 12),
            adminEmail: email, adminName: `${tag} Admin`, adminPassword: 'CacheCiPass!23',
            phone: '08000000000', address: 'CI test address', state: 'Lagos', planType: 'free',
        },
    });
    expect(res.ok(), `onboarding failed: ${await res.text()}`).toBeTruthy();
    return { email, password: 'CacheCiPass!23', schoolName };
}

async function loginViaForm(page: Page, baseURL: string, email: string, password: string) {
    // Audit mode is what makes each dashboard publish its window.<ROLE>_NAVIGATE
    // hook at all (e.g. ParentDashboard only does it under audit mode) — see
    // network-resilience.spec.ts and the every-button suites for the same setup.
    await page.addInitScript(() => {
        try {
            (window as any).__AUDIT_MODE__ = true;
            localStorage.setItem('audit_mode', 'true');
        } catch { /* storage unavailable */ }
    });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('input[type="text"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 30_000 });
    await emailInput.fill(email);
    const pwInput = page.locator('input[type="password"]').first();
    try {
        await pwInput.waitFor({ state: 'visible', timeout: 15_000 });
    } catch (e) {
        const bodyText = await page.locator('body').innerText().catch(() => '(unreadable)');
        throw new Error(`password field never appeared after filling email. Visible body text: ${bodyText.slice(0, 800)}`);
    }
    await pwInput.fill(password);
    await page.locator('button[type="submit"]').first().click();
    // Any authenticated dashboard mounts a nav hook under audit mode; without
    // it we only have "did the login form go away", which is a weaker signal.
    await page.waitForFunction(
        () => Object.keys(window as any).some((k) => /_NAVIGATE$/.test(k)),
        null,
        { timeout: 30_000 },
    );
}

async function logoutViaAuthContext(page: Page) {
    // The version-mismatch "System Update Required" toast (UpdatePrompt,
    // fixed z-[9999]) can sit on top of the sidebar and swallow a click aimed
    // at whatever's underneath it — dismiss it first so it can't intercept
    // the real target.
    const dismiss = page.getByRole('button', { name: /not now/i }).first();
    if (await dismiss.isVisible().catch(() => false)) {
        await dismiss.click().catch(() => { });
    }
    // Drive the real signOut() rather than clearing storage ourselves — this
    // test exists specifically to verify what THAT function does. Every role
    // sidebar (DashboardSidebar.tsx) renders it as a plain button containing
    // the literal text "Logout" — no aria-label or test id. The floating
    // "Install App" PWA button visually overlaps it, and even Playwright's
    // force:true (which skips actionability pre-checks but still dispatches a
    // real mouse event at that screen position) was intercepted by it — so
    // this calls the button's own native .click() directly, same as a real
    // click's end effect on the DOM/React, without going through hit-testing
    // at all.
    const logoutBtn = page.locator('button:has-text("Logout")').first();
    await logoutBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await logoutBtn.evaluate((el: HTMLElement) => el.click());
}

async function dumpClientStorage(page: Page) {
    return page.evaluate(async () => {
        const ls: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)!;
            ls[k] = localStorage.getItem(k) || '';
        }
        const ss: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i)!;
            ss[k] = sessionStorage.getItem(k) || '';
        }
        let idbReactQuery = '';
        try {
            const dbs = await indexedDB.databases?.();
            const names = (dbs || []).map((d) => d.name);
            // idb-keyval's default store is 'keyval-store' in a DB literally
            // named 'keyval-store' unless overridden — read it generically via
            // a raw open rather than importing idb-keyval into page context.
            for (const name of names) {
                if (!name) continue;
                await new Promise<void>((resolve) => {
                    const req = indexedDB.open(name);
                    req.onsuccess = () => {
                        try {
                            const db = req.result;
                            const storeNames = Array.from(db.objectStoreNames);
                            if (!storeNames.length) { db.close(); return resolve(); }
                            const tx = db.transaction(storeNames, 'readonly');
                            let pending = storeNames.length;
                            for (const sn of storeNames) {
                                const getAll = tx.objectStore(sn).getAll();
                                getAll.onsuccess = () => {
                                    idbReactQuery += JSON.stringify(getAll.result).slice(0, 200000);
                                    if (--pending === 0) { db.close(); resolve(); }
                                };
                                getAll.onerror = () => { if (--pending === 0) { db.close(); resolve(); } };
                            }
                        } catch { resolve(); }
                    };
                    req.onerror = () => resolve();
                });
            }
        } catch { /* IndexedDB introspection best-effort */ }
        return { ls: JSON.stringify(ls), ss: JSON.stringify(ss), idb: idbReactQuery, html: document.body.innerHTML.slice(0, 500000) };
    });
}

test.describe('Cache isolation across a tenant switch on one browser', () => {
    test.setTimeout(120_000);

    test('School B sees zero School A data in localStorage, sessionStorage, IndexedDB or the rendered page', async ({ page, request, baseURL }) => {
        const base = apiBase(baseURL!);
        const schoolA = await onboardThrowawaySchool(request, base, 'cacha');
        const schoolB = await onboardThrowawaySchool(request, base, 'cachb');

        // A real, uniquely-named student is the leak signal, not the school's
        // own name — the dashboard sidebar shows a fixed platform brand label
        // ("Oliskey School"), not the tenant's actual name, so that would
        // never have appeared regardless of any real leak. An enrolled
        // student's name renders directly in the student list.
        const loginA = await request.post(`${base}/auth/login`, { data: { email: schoolA.email, password: schoolA.password } });
        const { token: adminATokenForSetup } = await loginA.json();
        const needle = `Cacheleaktest${Date.now().toString(36)}`;
        const enroll = await request.post(`${base}/students/enroll`, {
            headers: { Authorization: `Bearer ${adminATokenForSetup}` },
            data: { firstName: needle, lastName: 'Student' },
        });
        expect(enroll.ok(), `student enrollment for the leak-detection fixture failed: ${await enroll.text()}`).toBeTruthy();

        // --- School A: log in through the real browser, visit the student list ---
        await loginViaForm(page, baseURL!, schoolA.email, schoolA.password);
        await page.evaluate(() => {
            const nav = Object.keys(window as any).find((k) => /_NAVIGATE$/.test(k));
            if (nav) (window as any)[nav]('studentList', 'studentList', {});
        });
        // A newly-enrolled student lands in a stage/grade section that may be
        // collapsed by default (StudentListScreen renders a closed section's
        // rows as nothing, not just hidden) — search forces every matching
        // section open, same as a real admin would use to find it.
        await page.getByPlaceholder(/search by name/i).first().fill(needle);
        await page.getByText(needle, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });

        const afterA = await dumpClientStorage(page);
        expect(afterA.html, 'the enrolled student never rendered while logged in as School A — the setup itself is broken').toContain(needle);

        // --- Log out through the real UI/AuthContext path — no manual cleanup
        // here, deliberately: this test exists to prove signOut() itself does
        // the cleanup, so masking a gap in it would defeat the point. ---
        await logoutViaAuthContext(page);
        await page.waitForTimeout(1000);
        // A fresh navigation, simulating the next person walking up to a
        // shared device, rather than continuing in whatever in-memory state
        // the SPA happened to be left in.
        await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });

        // --- School B: log in on the SAME page/profile ---
        await loginViaForm(page, baseURL!, schoolB.email, schoolB.password);
        await page.evaluate(() => {
            const nav = Object.keys(window as any).find((k) => /_NAVIGATE$/.test(k));
            if (nav) (window as any)[nav]('studentList', 'studentList', {});
        });
        // Search for the SAME needle here too — searching force-opens every
        // section (see above), so this proves a genuine "not found" rather
        // than merely "the default view happened not to show it".
        const searchB = page.getByPlaceholder(/search by name/i).first();
        await searchB.waitFor({ state: 'visible', timeout: 15_000 });
        await searchB.fill(needle);
        await page.getByText(/no students found/i).first().waitFor({ state: 'visible', timeout: 15_000 });
        // Clear the search box before dumping storage — its own `value`
        // attribute would otherwise contain the needle (it's an input echoing
        // back what was just typed into it, not a rendered result) and give a
        // false positive in the checks below.
        await searchB.fill('');

        const afterB = await dumpClientStorage(page);

        // The actual assertions: School A's student must not survive anywhere
        // a viewer of School B's session could read it.
        expect(afterB.html, 'School A\'s student leaked into the rendered page after switching to School B').not.toContain(needle);
        expect(afterB.ls, 'School A\'s student leaked into localStorage').not.toContain(needle);
        expect(afterB.ss, 'School A\'s student leaked into sessionStorage').not.toContain(needle);
        expect(afterB.idb, 'School A\'s student leaked into the IndexedDB-persisted React Query cache').not.toContain(needle);
        expect(afterB.ls, "School A's admin email leaked into localStorage").not.toContain(schoolA.email);
        expect(afterB.idb, "School A's admin email leaked into IndexedDB").not.toContain(schoolA.email);
    });
});
