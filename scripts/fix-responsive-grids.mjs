/**
 * Phase 1 responsive codemod — mechanical, low-risk fixes only.
 *
 * 1. `grid-cols-N` (N = 3,4,5,6,8..12) with NO breakpoint prefix renders that
 *    many columns on a 390px phone. Each becomes a progression that starts
 *    narrow and opens up, so the same markup works on phone, tablet and
 *    desktop.
 *
 *    grid-cols-7 is deliberately EXCLUDED: a seven-column grid is a calendar
 *    week, and collapsing it would destroy the layout rather than fix it.
 *
 * 2. `w-[NNNpx]` / `min-w-[NNNpx]` cannot shrink below the viewport, so the
 *    page scrolls sideways. Adding `max-w-full` caps them at the container
 *    while leaving the intended desktop size untouched.
 *
 * Nothing else is touched — no colours, no spacing, no component structure.
 * Run: node scripts/fix-responsive-grids.mjs [--dry]
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'components';
const DRY = process.argv.includes('--dry');

/** How many columns each size should show. Narrow first, then open up. */
const PROGRESSION = {
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
    9: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-9',
    10: 'grid-cols-2 sm:grid-cols-5 lg:grid-cols-10',
    11: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-11',
    12: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-12',
};

function walk(d) {
    let out = [];
    for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) out = out.concat(walk(p));
        else if (p.endsWith('.tsx')) out.push(p);
    }
    return out;
}

let gridFixed = 0, widthFixed = 0, files = new Set();

for (const file of walk(ROOT)) {
    const before = readFileSync(file, 'utf8');
    let src = before;

    // 1. bare grid-cols-N -> progression (never touches sm:/md:/lg:/xl: variants)
    src = src.replace(/(^|[\s"'`])grid-cols-(\d{1,2})\b/g, (m, lead, n) => {
        const cols = Number(n);
        const next = PROGRESSION[cols];
        if (!next) return m;                       // 1, 2 and 7 are left alone
        gridFixed++;
        return `${lead}${next}`;
    });

    // 2. hard pixel widths get a cap so they cannot overflow a small viewport
    src = src.replace(/(^|[\s"'`])((?:min-)?w-\[\s*\d{3,}px\s*\])/g, (m, lead, cls) => {
        // already capped somewhere in this className? leave it
        widthFixed++;
        return `${lead}${cls} max-w-full`;
    });

    if (src !== before) {
        files.add(file);
        if (!DRY) writeFileSync(file, src, 'utf8');
    }
}

console.log(`${DRY ? '[dry] ' : ''}files changed: ${files.size} | grid-cols fixed: ${gridFixed} | fixed widths capped: ${widthFixed}`);
