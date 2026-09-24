/**
 * Check a page at the three stages: mobile, tablet, desktop.
 *
 * Eyeballing a screenshot tells you something looks wrong; it does not tell you
 * which box is the wrong size. This measures, in a real browser, the four
 * failures that actually produce the cramped screens people report:
 *
 *   clipped       the element's own content is wider than the box it was given,
 *                 so the text paints over whatever sits beside it
 *   escaped       the element's box extends past its own parent's box
 *   torn          a phrase that should read as one line was broken across lines
 *                 ("last 30 days" rendered as "last 30" / "days")
 *   page-overflow the document scrolls sideways
 *
 * A deliberate single-line ellipsis (Tailwind's `truncate`) is a designed
 * truncation, not a defect, so it is excluded from all of these.
 *
 * Usage:
 *   node scripts/check-responsive-stages.mjs <url> [selector]
 *
 *   node scripts/check-responsive-stages.mjs http://localhost:3000
 *   node scripts/check-responsive-stages.mjs file:///C:/tmp/harness.html "[data-card]"
 *
 * `selector` narrows the check to the subtrees you care about; it defaults to
 * the whole body. Exits non-zero when anything is flagged, so it can gate CI.
 */
import { chromium } from 'playwright';

const [, , url, selector = 'body'] = process.argv;

if (!url) {
    console.error('usage: node scripts/check-responsive-stages.mjs <url> [selector]');
    process.exit(2);
}

const STAGES = [
    { name: 'mobile ', width: 390, height: 844 },
    { name: 'tablet ', width: 820, height: 1180 },
    { name: 'desktop', width: 1440, height: 900 },
];

/** Phrases that must never be split across lines, checked wherever they appear. */
const PHRASE_ATTR = 'data-keep-whole';

const browser = await chromium.launch();
let flagged = 0;

for (const stage of STAGES) {
    const page = await browser.newPage({ viewport: { width: stage.width, height: stage.height } });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(400);                       // let fonts settle before measuring

    const problems = await page.evaluate(({ selector, PHRASE_ATTR }) => {
        const found = [];
        const roots = [...document.querySelectorAll(selector)];
        const all = new Set();
        for (const root of roots) for (const el of root.querySelectorAll('*')) all.add(el);

        const label = (el) => {
            const id = el.getAttribute('data-check') || el.id || el.className;
            const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
            return `<${el.tagName.toLowerCase()}> "${text}"  ${String(id).slice(0, 40)}`;
        };

        for (const el of all) {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const ellipsised = style.textOverflow === 'ellipsis' && style.whiteSpace === 'nowrap';

            // content wider than its own box (an intentional ellipsis excepted)
            if (!ellipsised && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
                found.push({ kind: 'clipped', el: label(el), by: el.scrollWidth - el.clientWidth });
            }

            // box sticking out past its parent
            const parent = el.parentElement;
            if (parent) {
                const a = el.getBoundingClientRect(), b = parent.getBoundingClientRect();
                const pStyle = getComputedStyle(parent);
                const scrolls = /auto|scroll/.test(pStyle.overflowX);   // a scroll region is allowed to be wider
                if (!scrolls && a.width > 0 && b.width > 0) {
                    const over = Math.max(a.right - b.right, b.left - a.left);
                    if (over > 1) found.push({ kind: 'escaped', el: label(el), by: Math.round(over) });
                }
            }

            // a phrase torn across lines
            if (el.hasAttribute(PHRASE_ATTR) && style.whiteSpace !== 'nowrap') {
                const range = document.createRange();
                range.selectNodeContents(el);
                const lines = range.getClientRects().length;
                if (lines > 1) found.push({ kind: 'torn', el: label(el), by: lines });
            }
        }

        const doc = document.documentElement;
        if (doc.scrollWidth > doc.clientWidth + 1) {
            found.push({ kind: 'page-overflow', el: 'document', by: doc.scrollWidth - doc.clientWidth });
        }
        return found;
    }, { selector, PHRASE_ATTR });

    const tag = `${stage.name} ${String(stage.width).padStart(4)}px`;
    if (problems.length === 0) {
        console.log(`  PASS  ${tag}`);
    } else {
        flagged += problems.length;
        console.log(`  FAIL  ${tag}  — ${problems.length} problem(s)`);
        for (const p of problems) console.log(`          ${p.kind.padEnd(13)} ${p.el}  (+${p.by})`);
    }
    await page.close();
}

await browser.close();
console.log(flagged === 0 ? '\nAll three stages clean.' : `\n${flagged} problem(s) across the three stages.`);
process.exit(flagged === 0 ? 0 : 1);
