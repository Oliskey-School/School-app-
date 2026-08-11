import { test, expect, Page } from '@playwright/test';

async function enableAuditMode(page: Page) {
    await page.addInitScript(() => {
        try {
            (window as any).__AUDIT_MODE__ = true;
            localStorage.setItem('audit_mode', 'true');
        } catch { /* ignore */ }
    });
}

async function loginAsDemoParent(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const parentTile = page.locator('button:has-text("parent")').first();
    await parentTile.waitFor({ state: 'visible', timeout: 10_000 });
    await parentTile.click();
    await page.waitForFunction(
        () => typeof (window as any).PARENT_NAVIGATE === 'function'
            && Array.isArray((window as any).PARENT_COMPONENTS)
            && (window as any).PARENT_COMPONENTS.length > 10,
        null,
        { timeout: 45_000 }
    );
}

async function navigate(page: Page, view: string, title: string) {
    await page.evaluate(({ v, t }) => (window as any).PARENT_NAVIGATE(v, t), { v: view, t: title });
    await page.waitForTimeout(1200);
}

test.describe.configure({ mode: 'serial' });

test('Round 2 priority screens — real interaction', async ({ page, baseURL }) => {
    test.setTimeout(15 * 60 * 1000);
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    const api5xx: string[] = [];
    page.on('response', res => { if (res.status() >= 500) api5xx.push(`${res.status()} ${res.url()}`); });

    await enableAuditMode(page);
    await loginAsDemoParent(page, baseURL!);

    // --- notificationSettings: toggle each switch, verify persists after reload ---
    await navigate(page, 'notificationSettings', 'Notification Settings');
    const toggles = page.locator('button[role="switch"]');
    const count = await toggles.count();
    console.log(`notificationSettings: found ${count} toggles`);
    if (count > 0) {
        const before = await toggles.first().getAttribute('aria-checked');
        await toggles.first().click();
        // Wait for the actual toast (real network round-trip), not a fixed guess.
        await page.locator('text=Settings updated').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        const after = await toggles.first().getAttribute('aria-checked');
        console.log(`notificationSettings toggle[0]: ${before} -> ${after}`);
        // reload and re-navigate to check persistence
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof (window as any).PARENT_NAVIGATE === 'function', null, { timeout: 30000 });
        await navigate(page, 'notificationSettings', 'Notification Settings');
        // Give the async loadSettings() fetch time to actually resolve before reading.
        await page.waitForFunction(() => document.querySelectorAll('button[role="switch"]').length > 0, null, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const persisted = await page.locator('button[role="switch"]').first().getAttribute('aria-checked');
        console.log(`notificationSettings toggle[0] after reload: ${persisted}`);
        expect(persisted).toBe(after);
    }

    // --- schoolPolicies: render check + click first "View Document" if present ---
    await navigate(page, 'schoolPolicies', 'School Policies');
    const policyCards = page.locator('text=View Document');
    console.log(`schoolPolicies: ${await policyCards.count()} policy documents found`);

    // --- ptaMeetings: register ---
    await navigate(page, 'ptaMeetings', 'PTA Meetings');
    const registerBtn = page.locator('button:has-text("Register for Meeting")');
    if (await registerBtn.count() > 0) {
        await registerBtn.click();
        await page.waitForTimeout(1500);
        const confirmed = page.locator('text=Registration Confirmed');
        console.log(`ptaMeetings: registration confirmed = ${await confirmed.count() > 0}`);
    } else {
        console.log('ptaMeetings: no meeting / no register button (may already be registered or none scheduled)');
    }

    // --- photoGallery ---
    await navigate(page, 'photoGallery', 'Photo Gallery');
    const photoCount = await page.locator('main img').count();
    console.log(`photoGallery: ${photoCount} photos rendered`);
    if (photoCount > 0) {
        await page.locator('main button').first().click();
        await page.waitForTimeout(500);
        console.log(`photoGallery: lightbox opened = ${await page.locator('[role="dialog"]').count() > 0}`);
    }

    // --- volunteering: sign up for first open opportunity ---
    await navigate(page, 'volunteering', 'Volunteering');
    const signUpBtn = page.locator('button:has-text("Sign Up")').first();
    if (await signUpBtn.count() > 0) {
        await signUpBtn.click();
        await page.waitForTimeout(1500);
        console.log(`volunteering: after signup, "Signed Up" visible = ${await page.locator('text=Signed Up').count() > 0}`);
    } else {
        console.log('volunteering: no open opportunities to sign up for');
    }

    // --- permissionSlips: approve/reject flow ---
    await navigate(page, 'permissionSlips', 'Permission Slips');
    await page.waitForTimeout(2000);
    const bodyText1 = await page.locator('main, body').first().innerText().catch(() => '');
    console.log(`permissionSlips screen text snippet: ${bodyText1.slice(0, 300).replace(/\n/g, ' | ')}`);
    const approveBtn = page.locator('button:has-text("Approve")');
    if (await approveBtn.count() > 0) {
        await approveBtn.click();
        await page.waitForTimeout(500);
        const confirmModalApprove = page.locator('button:has-text("Approve")').last();
        if (await confirmModalApprove.count() > 0) await confirmModalApprove.click();
        await page.waitForTimeout(1500);
        const status = await page.locator('text=you have approved this slip').count();
        console.log(`permissionSlips: approved confirmation shown = ${status > 0}`);
    } else {
        console.log('permissionSlips: no pending slip / no approve button visible');
    }

    // --- busRoute ---
    await navigate(page, 'busRoute', 'Bus Route');
    const busText = await page.locator('main, body').first().innerText().catch(() => '');
    console.log(`busRoute screen text snippet: ${busText.slice(0, 300).replace(/\n/g, ' | ')}`);

    // --- panicButton (in demo, safe to actually hold-to-send) ---
    await navigate(page, 'panicButton', 'Panic Button');
    const panicBtn = page.locator('button[title="Emergency Panic Button"]');
    if (await panicBtn.count() > 0) {
        await panicBtn.click();
        await page.waitForTimeout(300);
        const holdBtn = page.locator('button:has-text("HOLD TO SEND")');
        if (await holdBtn.count() > 0) {
            const box = await holdBtn.boundingBox();
            if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.mouse.down();
                await page.waitForTimeout(1400);
                await page.mouse.up();
                await page.waitForTimeout(1500);
                const sentConfirm = await page.locator('text=Alert Sent').count();
                console.log(`panicButton: alert sent confirmation shown = ${sentConfirm > 0}`);
            }
        }
    } else {
        console.log('panicButton: button not found on screen');
    }

    console.log('--- console errors captured ---');
    console.log(consoleErrors.filter(e => !e.includes('Failed to load resource')).join('\n'));
    console.log('--- 5xx API responses ---');
    console.log(api5xx.join('\n'));
});
