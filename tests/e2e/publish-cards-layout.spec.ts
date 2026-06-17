import { test, expect, Page } from '@playwright/test';

/**
 * Publish Reports Dashboard — card layout.
 * Regression: the PUBLISH / UNPUBLISH action buttons (two `flex-1` items that couldn't
 * shrink below their content) overflowed past the card's right edge and overlapped the
 * neighbouring card. The grade badge also truncated to "GRA…". This verifies every card's
 * buttons and grade badge stay INSIDE the card at desktop AND on a phone.
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

async function openPublishing(page: Page) {
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('reportCardPublishing', 'Publish Reports', {}));
    await page.locator('[data-report-card="true"]').first().waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(800);
}

/** Returns the worst horizontal overflow (px) of any control past its card edge. */
async function measureOverflow(page: Page) {
    return page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[data-report-card="true"]')) as HTMLElement[];
        let worst = 0;
        let count = 0;
        for (const card of cards) {
            const cr = card.getBoundingClientRect();
            const controls = Array.from(card.querySelectorAll('button, [class*="rounded-lg"], [class*="rounded-xl"]')) as HTMLElement[];
            for (const el of controls) {
                const r = el.getBoundingClientRect();
                if (r.width === 0) continue;
                const rightSpill = r.right - cr.right;
                const leftSpill = cr.left - r.left;
                worst = Math.max(worst, rightSpill, leftSpill);
                count++;
            }
        }
        return { worst, cards: cards.length, controls: count };
    });
}

test('Publish cards: no button/badge overflows the card on desktop', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 }); // 4-column grid (narrowest cards)
    await loginAsDemoAdmin(page, baseURL!);
    await openPublishing(page);

    const { worst, cards, controls } = await measureOverflow(page);
    test.skip(cards === 0, 'Demo has no report cards on the publishing screen');
    expect(controls, 'no controls found in cards').toBeGreaterThan(0);
    // 1px tolerance for sub-pixel rounding; anything more is a real overflow/overlap.
    expect(worst, `a control overflows its card by ${worst}px`).toBeLessThanOrEqual(1.5);
});

test('Publish cards: no button/badge overflows the card on a phone', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsDemoAdmin(page, baseURL!);
    await openPublishing(page);

    const { worst, cards } = await measureOverflow(page);
    test.skip(cards === 0, 'Demo has no report cards on the publishing screen');
    expect(worst, `a control overflows its card by ${worst}px on mobile`).toBeLessThanOrEqual(1.5);
});
