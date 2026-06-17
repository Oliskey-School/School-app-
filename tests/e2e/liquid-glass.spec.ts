import { test, expect, Page } from '@playwright/test';

/**
 * Appearance (in Settings): Normal vs Liquid Glass theme toggle, full accent
 * re-theme (recolours every accent app-wide via --accent-* vars), and the glass
 * fine-tuning — all persisted to the device.
 */

async function loginAsDemoAdmin(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const adminTile = page.locator('button:has-text("admin")').first();
    await adminTile.waitFor({ state: 'visible', timeout: 10_000 });
    await adminTile.click();
    await page.waitForFunction(() => typeof (window as any).ADMIN_NAVIGATE === 'function', null, { timeout: 45_000 });
}

const hasGlass = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('glass'));
const accent600 = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-600').trim());
const panelBlur = (page: Page) =>
    page.evaluate(() => {
        const el = document.querySelector('.liquid-glass') as HTMLElement | null;
        if (!el) return '';
        const cs = getComputedStyle(el);
        return cs.backdropFilter || (cs as any).webkitBackdropFilter || '';
    });

test('Appearance: theme toggle + accent re-theme, persisted', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsDemoAdmin(page, baseURL!);

    // Liquid Glass is ON by default, with the original indigo accent.
    expect(await hasGlass(page), 'glass should be on by default').toBe(true);

    // Open the Appearance panel (now in Settings, no floating button).
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('appearanceSettings', 'Appearance & Theme', {}));
    await page.getByRole('heading', { name: 'Appearance', exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(600);
    expect(await accent600(page)).toBe('79 70 229');      // indigo default
    expect(await panelBlur(page)).toMatch(/blur/);          // panel is frosted in glass mode
    await page.screenshot({ path: '.playwright-results/appearance-panel.png' });

    // Pick the Emerald accent → re-themes the accent variable app-wide.
    await page.getByRole('button', { name: 'Emerald' }).click();
    expect(await accent600(page), 'accent did not re-theme').toBe('5 150 105');

    // The choice is saved under a PER-USER key (so it can't leak to other users on a
    // shared device) — never the old global key.
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('oliskey:appearance')));
    expect(keys.length, 'no appearance key saved').toBeGreaterThan(0);
    expect(keys.includes('oliskey:appearance'), 'used the old shared global key (not isolated)').toBe(false);
    expect(keys.every((k) => k.length > 'oliskey:appearance:'.length), 'appearance key is not user-scoped').toBe(true);

    // The whole app is now emerald — capture the dashboard.
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('dashboard', 'Dashboard', {}));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.playwright-results/appearance-emerald-dashboard.png' });

    // Back to the panel; switch to Normal → glass turns off (solid, no blur).
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('appearanceSettings', 'Appearance & Theme', {}));
    await page.getByRole('heading', { name: 'Appearance', exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByRole('button', { name: 'Normal', exact: true }).click();
    expect(await hasGlass(page), 'Normal mode should remove glass').toBe(false);
    expect(await panelBlur(page), 'Normal mode still has glass blur').not.toMatch(/blur/);

    // Back to Liquid Glass → frosted again.
    await page.getByRole('button', { name: 'Liquid Glass', exact: true }).click();
    expect(await hasGlass(page)).toBe(true);
    expect(await panelBlur(page)).toMatch(/blur/);

    // Choice persists across a reload (saved to the device).
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    expect(await accent600(page), 'accent did not persist after reload').toBe('5 150 105');
    expect(await hasGlass(page), 'glass mode did not persist after reload').toBe(true);
});
