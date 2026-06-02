import { test, expect, Page } from '@playwright/test';

async function loginAsDemoAdmin(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click({ force: true });
    const adminTile = page.locator('button:has-text("admin")').first();
    await adminTile.waitFor({ state: 'visible', timeout: 10_000 });
    await adminTile.click({ force: true });
    await page.waitForFunction(
        () => typeof (window as any).ADMIN_NAVIGATE === 'function',
        null,
        { timeout: 45_000 }
    );
}

async function waitForUpdatePrompt(page: Page) {
    // The UpdatePrompt is the outer fixed wrapper that contains the heading.
    const container = page.locator('div.fixed').filter({
        has: page.locator('h3:has-text("System Update Required"), h3:has-text("New Update Available")')
    }).first();
    await container.waitFor({ state: 'visible', timeout: 15_000 });
    const heading = container.locator('h3').first();
    return { container, heading };
}

test.describe('System Update Required prompt — buttons', () => {

    test.beforeEach(async ({ page, baseURL }) => {
        await loginAsDemoAdmin(page, baseURL!);
        // Wipe any prior dismissal so the prompt actually mounts
        await page.evaluate(() => {
            Object.keys(sessionStorage).filter(k => k.startsWith('update_dismissed_')).forEach(k => sessionStorage.removeItem(k));
        });
        // Force re-evaluation by reloading
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
            () => typeof (window as any).ADMIN_NAVIGATE === 'function',
            null,
            { timeout: 30_000 }
        );
    });

    test('X (close) button — hides the prompt, sets sessionStorage flag, dispatches update_prompt_closed event', async ({ page }) => {
        const { container, heading } = await waitForUpdatePrompt(page);

        await page.evaluate(() => {
            (window as any).__updateEventFired = false;
            window.addEventListener('update_prompt_closed', () => {
                (window as any).__updateEventFired = true;
            }, { once: true });
        });

        // Fire the X via DOM click — bypasses z-index hit-testing with the bottom nav.
        await page.evaluate(() => {
            const headings = Array.from(document.querySelectorAll('h3'));
            const promptHeading = headings.find(h => /System Update Required|New Update Available/.test(h.textContent || ''));
            const container = promptHeading?.closest('div.fixed');
            const buttons = Array.from(container?.querySelectorAll('button') || []);
            // X button is the only one without "Update Now" / "Not Now" text
            const xBtn = buttons.find(b => {
                const t = (b.textContent || '').trim();
                return t !== 'Update Now' && t !== 'Not Now';
            });
            (xBtn as HTMLButtonElement | undefined)?.click();
        });

        await expect(heading).toBeHidden({ timeout: 4000 });
        const eventFired = await page.evaluate(() => (window as any).__updateEventFired === true);
        expect(eventFired).toBe(true);

        const dismissedKeys = await page.evaluate(() =>
            Object.keys(sessionStorage).filter(k => k.startsWith('update_dismissed_'))
        );
        expect(dismissedKeys.length).toBeGreaterThan(0);
    });

    test('Not Now button — hides the prompt, sets sessionStorage flag, dispatches update_prompt_closed event', async ({ page }) => {
        const { container, heading } = await waitForUpdatePrompt(page);

        await page.evaluate(() => {
            (window as any).__updateEventFired = false;
            window.addEventListener('update_prompt_closed', () => {
                (window as any).__updateEventFired = true;
            }, { once: true });
        });

        await page.evaluate(() => {
            const headings = Array.from(document.querySelectorAll('h3'));
            const promptHeading = headings.find(h => /System Update Required|New Update Available/.test(h.textContent || ''));
            const container = promptHeading?.closest('div.fixed');
            const btn = Array.from(container?.querySelectorAll('button') || [])
                .find(b => (b.textContent || '').trim() === 'Not Now');
            (btn as HTMLButtonElement | undefined)?.click();
        });
        await expect(heading).toBeHidden({ timeout: 4000 });

        const eventFired = await page.evaluate(() => (window as any).__updateEventFired === true);
        expect(eventFired).toBe(true);

        const dismissedKeys = await page.evaluate(() =>
            Object.keys(sessionStorage).filter(k => k.startsWith('update_dismissed_'))
        );
        expect(dismissedKeys.length).toBeGreaterThan(0);
    });

    test('Update Now button — triggers a full page reload', async ({ page }) => {
        const { container } = await waitForUpdatePrompt(page);

        // Plant a marker BEFORE the click. A reload wipes window globals, so if
        // the marker is gone after we click, the reload definitely happened.
        await page.evaluate(() => { (window as any).__reloadMarker = 'present'; });
        const beforeMarker = await page.evaluate(() => (window as any).__reloadMarker);
        expect(beforeMarker).toBe('present');

        // Click Update Now via DOM (bypasses bottom-nav z-index hit testing)
        await page.evaluate(() => {
            const headings = Array.from(document.querySelectorAll('h3'));
            const promptHeading = headings.find(h => /System Update Required|New Update Available/.test(h.textContent || ''));
            const promptContainer = promptHeading?.closest('div.fixed');
            const btn = Array.from(promptContainer?.querySelectorAll('button') || [])
                .find(b => (b.textContent || '').trim() === 'Update Now');
            (btn as HTMLButtonElement | undefined)?.click();
        });

        // Wait briefly for reload, then re-check marker. After reload it's undefined.
        await page.waitForLoadState('domcontentloaded').catch(() => { });
        await page.waitForTimeout(800);
        const afterMarker = await page.evaluate(() => (window as any).__reloadMarker);
        expect(afterMarker).toBeUndefined();
    });
});
