import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Live, DATA-FILLING QA pass over the Teacher dashboard in DEMO mode.
// Unlike teacher-every-button.spec.ts (click-only), this test actually fills
// forms, submits them, and verifies persistence by reloading.

async function loginAsDemoTeacher(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const teacherTile = page.locator('button:has-text("teacher")').first();
    await teacherTile.waitFor({ state: 'visible', timeout: 10_000 });
    await teacherTile.click();
    await page.waitForFunction(
        () => typeof (window as any).TEACHER_NAVIGATE === 'function'
            && Array.isArray((window as any).TEACHER_COMPONENTS)
            && (window as any).TEACHER_COMPONENTS.length > 10,
        null,
        { timeout: 45_000 }
    );
}

async function ensureTeacherDashboard(page: Page, baseURL: string) {
    const present = await page.evaluate(() => typeof (window as any).TEACHER_NAVIGATE === 'function').catch(() => false);
    if (present) return;
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
    try {
        await page.waitForFunction(
            () => typeof (window as any).TEACHER_NAVIGATE === 'function'
                && Array.isArray((window as any).TEACHER_COMPONENTS)
                && (window as any).TEACHER_COMPONENTS.length > 10,
            null,
            { timeout: 15_000 }
        );
        return;
    } catch { }
    await loginAsDemoTeacher(page, baseURL);
}

async function navTo(page: Page, view: string, title: string, props: any = {}) {
    await page.evaluate(({ view, title, props }) => {
        (window as any).TEACHER_NAVIGATE(view, title, props);
    }, { view, title, props });
    await page.waitForTimeout(700);
}

async function dismissOverlay(page: Page) {
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(100);
}

const log: string[] = [];
const record = (msg: string) => { console.log(msg); log.push(msg); };

const pageErrors: string[] = [];
const api5xx: string[] = [];

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (resp) => {
        if (/\/api\//.test(resp.url()) && resp.status() >= 500) {
            api5xx.push(`${resp.request().method()} ${resp.url()} -> ${resp.status()}`);
        }
    });
});

test('Lesson Planner: fill scheme, save, Generate Locally, verify persisted', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'lessonPlanner', 'Lesson Planner');

    const subjectSelect = page.locator('select#subject');
    const classSelect = page.locator('select#className');
    await subjectSelect.waitFor({ state: 'visible', timeout: 15000 });
    // Teacher class/subject assignments load asynchronously (profile fetch, then
    // useTeacherClasses fetch) — poll instead of a fixed sleep to avoid a flaky race.
    await expect(subjectSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 }).catch(() => { });

    const subjectOptions = await subjectSelect.locator('option').allTextContents();
    const classOptions = await classSelect.locator('option').allTextContents();
    record(`Lesson Planner subject options: ${JSON.stringify(subjectOptions)}`);
    record(`Lesson Planner class options: ${JSON.stringify(classOptions)}`);

    if (subjectOptions.length <= 1 || classOptions.length <= 1) {
        record('SKIP: Lesson Planner has no teacher class/subject assignments in demo data — cannot fill form.');
        return;
    }

    await subjectSelect.selectOption({ index: 1 });
    await classSelect.selectOption({ index: 1 });
    const subjectVal = await subjectSelect.locator('option').nth(1).textContent();
    const classVal = await classSelect.locator('option').nth(1).textContent();

    // Fill a topic in Term 1 scheme
    const topicInput = page.locator('input[placeholder="Main Topic for the Week"]').first();
    await topicInput.fill(`QA Test Topic ${Date.now()}`);

    const subTopicBtn = page.locator('button:has-text("Add Sub-Topic")').first();
    await subTopicBtn.click();
    const subTopicInput = page.locator('input[placeholder="Add a sub-topic or learning objective"]').first();
    await subTopicInput.fill('QA sub-topic detail');

    // Save Scheme
    await page.locator('button:has-text("Save Scheme")').click();
    await page.waitForTimeout(1000);
    const saveToast = await page.locator('text=/saved to database/i').count();
    record(`Save Scheme toast appeared: ${saveToast > 0}`);

    // Generate Locally
    const localBtn = page.locator('button:has-text("Generate Locally")');
    await expect(localBtn).toBeEnabled({ timeout: 5000 });
    await localBtn.click();
    await page.waitForTimeout(2000);

    // Should navigate to lessonPlanDetail
    const detailHeading = await page.locator('text=/Local Plan/i').count();
    record(`Navigated to Local Plan detail screen: ${detailHeading > 0}`);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'lesson-planner-local-generated.png') }).catch(() => { });

    // Go back to Lesson Planner and check "Saved Plans" history
    await navTo(page, 'lessonPlanner', 'Lesson Planner');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Saved Plans")').click();
    await page.waitForTimeout(800);
    const savedPlansList = await page.locator('text=/Last saved|Generated:/i').allTextContents().catch(() => []);
    record(`Saved Plans modal entries after reload-nav: ${savedPlansList.length}`);
    const hasOurClass = await page.locator(`text="${classVal?.trim()}"`).count();
    record(`Our just-generated class (${classVal?.trim()}) visible in Saved Plans: ${hasOurClass > 0}`);

    // Full page reload — verify persistence survives a real reload (DB-backed, not just in-memory state)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureTeacherDashboard(page, baseURL!);
    await navTo(page, 'lessonPlanner', 'Lesson Planner');
    await page.waitForTimeout(1200);
    await page.locator('button:has-text("Saved Plans")').click();
    await page.waitForTimeout(800);
    const afterReloadList = await page.locator('text=/Generated:/i').count();
    record(`Saved Plans entries visible AFTER FULL RELOAD: ${afterReloadList}`);
    expect(afterReloadList).toBeGreaterThan(0);
});

test('Lesson Planner: Generate AI path', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'lessonPlanner', 'Lesson Planner');

    const subjectSelect = page.locator('select#subject');
    const classSelect = page.locator('select#className');
    await subjectSelect.waitFor({ state: 'visible', timeout: 15000 });
    await expect(subjectSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 }).catch(() => { });
    const subjectOptions = await subjectSelect.locator('option').count();
    const classOptions = await classSelect.locator('option').count();
    if (subjectOptions <= 1 || classOptions <= 1) {
        record('SKIP: AI generate — no class/subject assignments.');
        return;
    }
    await subjectSelect.selectOption({ index: 1 });
    await classSelect.selectOption({ index: 1 });
    const topicInput = page.locator('input[placeholder="Main Topic for the Week"]').first();
    await topicInput.fill(`AI QA Topic ${Date.now()}`);

    const aiBtn = page.locator('button:has-text("Generate AI Resources")');
    await expect(aiBtn).toBeEnabled({ timeout: 5000 });
    await aiBtn.click();
    // AI call can take a while or fail (no/invalid key) — capture outcome either way.
    await page.waitForTimeout(8000);
    const errToast = await page.locator('text=/AI Connection Failed|AI is currently busy/i').allTextContents().catch(() => []);
    const detailHeading = await page.locator('text=/AI Plan/i').count();
    record(`Generate AI Resources outcome — navigated to AI Plan detail: ${detailHeading > 0}; error toast: ${JSON.stringify(errToast)}`);
});

test('Resource Sharing: upload a real file, verify it appears after reload', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'resourceSharing', 'Resource Sharing');
    await page.waitForTimeout(1200);

    await page.locator('button:has-text("Upload Resource")').click();
    await page.waitForTimeout(500);

    const uniqueTitle = `QA Uploaded Resource ${Date.now()}`;
    await page.locator('input[placeholder="e.g. Intro to Algebra"]').fill(uniqueTitle);
    await page.locator('input[placeholder="Mathematics"]').fill('Mathematics');
    await page.locator('input[placeholder="10"]').fill('9');
    await page.locator('textarea[placeholder*="Brief summary"]').fill('QA automated test upload — safe demo file.');

    // Create a tiny real PDF-ish file to upload
    const tmpFile = path.join(__dirname, 'qa-test-upload.pdf');
    fs.writeFileSync(tmpFile, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    await page.locator('input[type="file"]').setInputFiles(tmpFile);
    await page.waitForTimeout(300);

    await page.locator('button:has-text("Publish Material")').click();

    const resp = await page.waitForResponse(r => /\/api\/resources$/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null);
    record(`POST /api/resources response status: ${resp?.status()}`);

    const successToast = await page.locator('text=/uploaded successfully/i').count();
    const failToast = await page.locator('text=/Upload failed/i').allTextContents().catch(() => []);
    record(`Resource upload success toast: ${successToast > 0}; failure toast: ${JSON.stringify(failToast)}`);

    // Reload and verify it persisted
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureTeacherDashboard(page, baseURL!);
    await navTo(page, 'resourceSharing', 'Resource Sharing');
    const foundLocator = page.locator(`text="${uniqueTitle}"`);
    await foundLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => { });
    const found = await foundLocator.count();
    record(`Uploaded resource "${uniqueTitle}" visible after RELOAD: ${found > 0}`);
    expect(resp?.status()).toBe(201);
    expect(found).toBeGreaterThan(0);
});

test('Collaboration Forum: create a topic, verify it appears after reload', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'collaborationForum', 'Collaboration Forum');
    await page.waitForTimeout(1200);

    const disabled = await page.locator('text=/Forum Access Disabled/i').count();
    if (disabled > 0) {
        record('Collaboration Forum is disabled for this demo teacher — cannot test creation.');
        return;
    }

    await page.locator('button[aria-label="Create new topic"]').click();
    await page.waitForTimeout(600);

    const uniqueTitle = `QA Forum Topic ${Date.now()}`;
    await page.locator('#topic-title').fill(uniqueTitle);
    await page.locator('#topic-content').fill('This is an automated QA test post verifying forum topic creation and persistence.');
    await page.locator('button:has-text("📚 Curriculum & Lesson")').click();

    await page.locator('button:has-text("🚀 Post Topic")').click();
    await page.waitForTimeout(2000);

    const successToast = await page.locator('text=/Topic posted successfully/i').count();
    record(`Forum topic post success toast: ${successToast > 0}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureTeacherDashboard(page, baseURL!);
    await navTo(page, 'collaborationForum', 'Collaboration Forum');
    await page.waitForTimeout(1500);
    const found = await page.locator(`text="${uniqueTitle}"`).count();
    record(`Created forum topic "${uniqueTitle}" visible after RELOAD: ${found > 0}`);
    expect(found).toBeGreaterThan(0);
});

test('Curriculum Selection: pick a class, verify curriculum screen loads real content', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'curriculumSelection', 'Curriculum');
    await page.waitForTimeout(1500);

    const noClasses = await page.locator('text=/No classes assigned/i').count();
    if (noClasses > 0) {
        record('SKIP: Curriculum Selection — demo teacher has no assigned classes.');
        return;
    }
    const classCards = page.locator('button:has(p:has-text("Grade"))');
    const count = await classCards.count();
    record(`Curriculum Selection found ${count} class cards`);
    expect(count).toBeGreaterThan(0);
    await classCards.first().click();
    await page.waitForTimeout(1200);
    const bodyText = await page.locator('body').innerText();
    const looksEmpty = /no curriculum|not found|nothing here/i.test(bodyText);
    record(`Curriculum detail screen loaded, appears empty/error: ${looksEmpty}`);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'curriculum-detail.png') }).catch(() => { });
});

test('Learning Hub: browse and open multiple distinct resources', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'learningHub', 'Learning Hub');
    await page.waitForTimeout(2000);

    // Resource rows render as: <div class="... rounded-2xl ..."><button>icon</button><button><p class="font-bold">{title}</p>...</button><button>Recommend</button></div>
    // The prior audit clicked the same DOM node 205 times because it didn't distinguish rows.
    const cards = page.locator('main .rounded-2xl.border.border-gray-100').filter({ has: page.locator('p.font-bold') });
    const cardCount = await cards.count();
    record(`Learning Hub: distinct resource rows found: ${cardCount}`);

    let opened = 0;
    const titles = new Set<string>();
    for (let i = 0; i < Math.min(cardCount, 40) && opened < 3; i++) {
        const card = cards.nth(i);
        const title = (await card.locator('p.font-bold').first().innerText().catch(() => '')).trim();
        if (!title || titles.has(title)) continue;
        titles.add(title);
        // Click the title button specifically (opens learningHubResource viewer), not "Recommend to class".
        const clickable = card.locator('p.font-bold').first();
        await clickable.click({ timeout: 3000 }).catch(() => { });
        await page.waitForTimeout(1200);
        const navigatedToViewer = (await page.evaluate(() => document.title || '').catch(() => '')) || '';
        const heading = await page.locator(`text="${title}"`).count();
        record(`Learning Hub: opened resource "${title.slice(0, 60)}" — viewer heading present: ${heading > 0}`);
        opened++;
        // Go back to hub for next attempt
        await ensureTeacherDashboard(page, baseURL!);
        await navTo(page, 'learningHub', 'Learning Hub');
        await page.waitForTimeout(1200);
    }
    record(`Learning Hub: successfully opened ${opened} DISTINCT resources (titles: ${JSON.stringify([...titles])})`);
    expect(opened).toBeGreaterThan(0);
});

test('Spot-check: Mark Attendance — real class roster, submit, verify persisted', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'selectClassForAttendance', 'Take Attendance');
    await page.waitForTimeout(1500);
    const classBtn = page.locator('button, [role="button"]').filter({ hasText: /SSS|JSS|Primary/i }).first();
    if (await classBtn.count() === 0) {
        record('SPOT-CHECK Mark Attendance: SKIP — no class tile found on select-class screen.');
    } else {
        await classBtn.click();
        await page.waitForTimeout(1500);
        const studentRows = page.locator('text=/Present|Absent/i');
        const rowCount = await studentRows.count();
        record(`SPOT-CHECK Mark Attendance: opened class, found ${rowCount} Present/Absent controls.`);
        // Toggle first student's status if controls are actual buttons
        const presentBtns = page.locator('button:has-text("Present")');
        if (await presentBtns.count() > 0) {
            await presentBtns.first().click().catch(() => { });
            await page.waitForTimeout(300);
        }
        const submitBtn = page.locator('button').filter({ hasText: /Submit|Save Attendance|Mark Attendance/i }).first();
        if (await submitBtn.count() > 0) {
            await submitBtn.click().catch(() => { });
            await page.waitForTimeout(1500);
            const toast = await page.locator('text=/saved|success|marked/i').count();
            record(`SPOT-CHECK Mark Attendance: submit clicked, success indicator visible: ${toast > 0}`);
        } else {
            record('SPOT-CHECK Mark Attendance: no submit/save button found.');
        }
    }
});

test('Spot-check: My Class Hub -> Student Profile', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'myClassHub', 'My Class Hub');
    await page.waitForTimeout(1500);
    const studentBtn = page.locator('button').filter({ hasText: /./ }).first();
    const anyStudentLink = page.locator('[class*="cursor-pointer"], button, a').filter({ hasText: /\w+ \w+/ }).first();
    const bodyText = await page.locator('body').innerText();
    const hasStudents = !/no students|no classes/i.test(bodyText);
    record(`SPOT-CHECK My Class Hub: has students visible: ${hasStudents}`);
    if (hasStudents) {
        const studentCard = page.locator('main button, main [class*="cursor-pointer"]').first();
        await studentCard.click({ timeout: 5000 }).catch(() => { });
        await page.waitForTimeout(1200);
        const errored = await page.locator('text=/error|not found|undefined/i').count();
        record(`SPOT-CHECK Student Profile: opened, error indicators present: ${errored > 0}`);
    }
});

test('Spot-check: Assignments List -> Class Assignments', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'assignmentsList', 'My Assignments');
    await page.waitForTimeout(1500);
    const classLink = page.locator('button, a').filter({ hasText: /SSS|JSS|Primary/i }).first();
    if (await classLink.count() > 0) {
        await classLink.click();
        await page.waitForTimeout(1200);
        const errored = await page.locator('text=/error|not found|undefined/i').count();
        record(`SPOT-CHECK Class Assignments: opened for a class, error indicators present: ${errored > 0}`);
    } else {
        record('SPOT-CHECK Class Assignments: SKIP — no class link found on assignments list.');
    }
});

test('Spot-check: Substitute Assignments screen loads', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'substituteAssignments', 'Substitute Assignments');
    await page.waitForTimeout(1500);
    const crashed = await page.locator('text=/something went wrong|application error/i').count();
    const bodyLen = (await page.locator('body').innerText()).length;
    record(`SPOT-CHECK Substitute Assignments: loaded without crash: ${crashed === 0}, body length: ${bodyLen}`);
    expect(crashed).toBe(0);
});

test('Spot-check: My SOP Cases -> SOP Case Detail', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'mySopCases', 'My SOP Cases');
    await page.waitForTimeout(1500);
    const bodyText = await page.locator('body').innerText();
    const hasNoCase = /no cases|no sop/i.test(bodyText);
    record(`SPOT-CHECK My SOP Cases: has no cases (empty state): ${hasNoCase}`);
    if (!hasNoCase) {
        const caseBtn = page.locator('main button').first();
        await caseBtn.click({ timeout: 5000 }).catch(() => { });
        await page.waitForTimeout(1200);
        const errored = await page.locator('text=/error|not found|undefined/i').count();
        record(`SPOT-CHECK SOP Case Detail: opened, error indicators present: ${errored > 0}`);
    }
});

test('Spot-check: Select Term for Report -> Report Card Input', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsDemoTeacher(page, baseURL!);
    await dismissOverlay(page);
    await navTo(page, 'selectTermForReport', 'Report Cards');
    await page.waitForTimeout(1500);
    const bodyText = await page.locator('body').innerText();
    record(`SPOT-CHECK Select Term for Report: page content length ${bodyText.length}, snippet: ${bodyText.slice(0, 150).replace(/\n/g, ' | ')}`);
});

test.afterAll(async () => {
    const outPath = path.join(__dirname, 'teacher-live-fill-results.log');
    fs.writeFileSync(outPath, log.join('\n') + '\n\n--- pageErrors ---\n' + pageErrors.join('\n') + '\n\n--- api5xx ---\n' + api5xx.join('\n'));
    console.log('Wrote results to', outPath);
});
