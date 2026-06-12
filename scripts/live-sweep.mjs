#!/usr/bin/env node
/**
 * LIVE BROWSER RENDER SWEEP (real Chromium via Playwright)
 *
 * Logs into the demo app as a given role, then drives EVERY registered
 * viewComponent through the dashboard's window navigation registry
 * (ADMIN_NAVIGATE / TEACHER_NAVIGATE / STUDENT_NAVIGATE / PARENT_NAVIGATE),
 * watching for real render crashes:
 *   - uncaught exceptions (page 'pageerror')
 *   - React error-boundary fallback cards ("We encountered ... error")
 *
 * Usage: node scripts/live-sweep.mjs <admin|teacher|student|parent>
 */
import { chromium } from 'playwright';

const ROLE = (process.argv[2] || 'admin').toLowerCase();
const BASE = process.env.APP_URL || 'http://localhost:3000';

const REG = {
  admin:   { nav: 'ADMIN_NAVIGATE',   list: 'ADMIN_COMPONENTS',   home: 'overview',  tile: 'School Admin' },
  teacher: { nav: 'TEACHER_NAVIGATE', list: 'TEACHER_COMPONENTS', home: 'overview',  tile: 'Teacher' },
  student: { nav: 'STUDENT_NAVIGATE', list: 'STUDENT_COMPONENTS', home: 'overview',  tile: 'Student' },
  parent:  { nav: 'PARENT_NAVIGATE',  list: 'PARENT_COMPONENTS',  home: 'dashboard', tile: 'Parent' },
}[ROLE];

if (!REG) { console.error('Unknown role:', ROLE); process.exit(1); }

const ERR_BOUNDARY = /encountered an issue while rendering|encountered a critical error|Cannot read properties of|Minified React error|Something went wrong/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Enable audit mode so dashboards expose their nav registry.
  await page.addInitScript(() => {
    try { localStorage.setItem('audit_mode', 'true'); } catch {}
    window.__AUDIT_MODE__ = true;
  });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));

  console.log(`\n=== LIVE SWEEP: ${ROLE.toUpperCase()} ===`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  // Go to the demo portal if we're on the main login view.
  const tryDemo = page.getByText(/Try Demo School/i).first();
  if (await tryDemo.isVisible().catch(() => false)) {
    await tryDemo.click().catch(() => {});
    await sleep(500);
  }

  // Click the role tile.
  const tile = page.getByRole('button', { name: new RegExp(REG.tile, 'i') }).first();
  await tile.waitFor({ state: 'visible', timeout: 20000 });
  await tile.click();

  // Wait for the dashboard's nav registry to appear.
  await page.waitForFunction(
    (reg) => typeof window[reg] === 'function', REG.nav, { timeout: 45000 }
  ).catch(() => { throw new Error(`Dashboard did not expose ${REG.nav} (login may have failed)`); });

  const views = await page.evaluate((l) => window[l] || [], REG.list);
  console.log(`Logged in. Driving ${views.length} viewComponents...\n`);

  const results = [];
  for (const view of views) {
    pageErrors.length = 0;
    // Reset to home, then navigate to the target view.
    await page.evaluate(([nav, home]) => window[nav]?.(home, home, {}), [REG.nav, REG.home]).catch(() => {});
    await sleep(120);
    await page.evaluate(([nav, v]) => window[nav]?.(v, v, {}), [REG.nav, view]).catch(() => {});
    await sleep(550);

    let boundary = false;
    try {
      const body = await page.evaluate(() => document.body.innerText || '');
      boundary = ERR_BOUNDARY.test(body);
    } catch {}

    const crashed = pageErrors.length > 0 || boundary;
    results.push({ view, crashed, boundary, errors: [...pageErrors] });
    process.stdout.write(crashed ? 'X' : '.');
  }

  console.log('\n');
  const failed = results.filter((r) => r.crashed);
  console.log(`RESULT: ${results.length - failed.length}/${results.length} screens rendered without a crash`);
  if (failed.length) {
    console.log(`\nCRASHED SCREENS (${failed.length}):`);
    for (const f of failed) {
      console.log(`  - ${f.view}${f.boundary ? ' [error-boundary]' : ''}${f.errors[0] ? ' :: ' + f.errors[0].slice(0, 140) : ''}`);
    }
  }

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('SWEEP FAILED:', e.message); process.exit(1); });
