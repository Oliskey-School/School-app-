import { test, expect, Page } from '@playwright/test';

/**
 * Generate Student ID → card preview.
 * Regression: the 856px card was scaled with a 'top center' origin while its wrapper
 * was sized to the SCALED dimensions, so the card overflowed its box to the right and
 * was clipped by overflow-hidden. With a 'top left' origin the whole card is visible.
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

test('Generate Student ID shows the FULL card, not clipped', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);

    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('idCardManagement', 'Student ID Cards', {}));
    await page.waitForTimeout(2500);

    const issueBtn = page.locator('button:has-text("Issue ID Card")').first();
    test.skip(await issueBtn.count() === 0, 'No students available to issue an ID card in the demo');
    await issueBtn.click();

    // The "Generate Student ID" modal opens.
    await expect(page.getByRole('heading', { name: /Generate Student ID/i })).toBeVisible();
    const modal = page.locator('div.max-w-4xl').filter({ hasText: 'Generate Student ID' }).first();
    const card = page.locator('[data-id-card="true"]').first();
    await expect(card).toBeVisible();

    // The card must sit fully INSIDE the modal horizontally (the clip bug pushed it past
    // the right edge). Allow a 2px rounding tolerance.
    const modalBox = await modal.boundingBox();
    const cardBox = await card.boundingBox();
    expect(modalBox, 'no modal box').not.toBeNull();
    expect(cardBox, 'no card box').not.toBeNull();
    expect(cardBox!.x, 'card overflows left of the modal').toBeGreaterThanOrEqual(modalBox!.x - 2);
    expect(cardBox!.x + cardBox!.width, 'card is clipped past the right edge of the modal')
        .toBeLessThanOrEqual(modalBox!.x + modalBox!.width + 2);
    // And it renders at a real, readable size (not collapsed).
    expect(cardBox!.width, 'card rendered too small').toBeGreaterThan(300);

    // The card carries the student's identity content (proves it actually rendered).
    await expect(card.getByText(/Valid Identity Document/i)).toBeVisible();
    await expect(card.getByText(/Student ID/i)).toBeVisible();

    // Download the PDF — verifies the html2canvas + jsPDF capture completes. The scatter
    // fix neutralises the preview's scale during capture, so this must finish and emit a
    // real download (previously the capture produced a garbled card).
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Download Official ID/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/_ID_Card\.pdf$/);

    // Close.
    await page.getByRole('button', { name: /Close Preview/i }).click();
    await expect(page.getByRole('heading', { name: /Generate Student ID/i })).toHaveCount(0);
});
