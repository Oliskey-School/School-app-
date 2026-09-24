/**
 * Phase 2b — let a wide data table scroll instead of being cut off.
 *
 * Most data tables here sit inside a card wrapper that carries `overflow-hidden`
 * so the rounded corners clip cleanly. On a phone that is actively harmful: the
 * table is wider than the card, and `overflow-hidden` means the right-hand
 * columns are not merely off-screen, they are unreachable — no scroll, no hint
 * that anything is missing.
 *
 * The fix is to wrap the table itself in its own `overflow-x-auto` layer, inside
 * the existing card. The card keeps its rounded clipping and its appearance is
 * unchanged; the table gains a horizontal scroll region of its own.
 *
 * Deliberately skipped:
 *   - tables built as HTML strings for a print window (PayslipViewer,
 *     StudentProfileEnhanced) — that markup is not React and not on screen.
 *   - report-card layouts with no `<thead>`, which are two-column print sheets
 *     that already fit; adding a scroll layer there risks the print output.
 *
 * Run: node scripts/fix-table-overflow.mjs [--dry]
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DRY = process.argv.includes('--dry');
const SCROLLABLE = /overflow-x-auto|overflow-auto|overflow-scroll/;

/**
 * Report cards are printed straight from the DOM (`window.print()` plus
 * `@media print` rules), and a scroll region can clip what actually comes out
 * of the printer. A school printing a term report is not a regression worth
 * risking, so these keep their current markup.
 */
const PRINTS_FROM_DOM = /(ReportCardTemplates|ReportCardPreview|DigitalReportCard)\.tsx$/;

function walk(dir) {
    let out = [];
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) out = out.concat(walk(p));
        else if (p.endsWith('.tsx')) out.push(p);
    }
    return out;
}

let wrapped = 0, skipped = 0;
const files = new Set();

for (const file of walk('components')) {
    const lines = readFileSync(file, 'utf8').split('\n');
    let changed = false;

    if (PRINTS_FROM_DOM.test(file)) continue;

    for (let i = lines.length - 1; i >= 0; i--) {          // bottom-up: indices stay valid
        const open = lines[i].match(/^(\s*)<table(\s[^>]*)?>\s*$/);
        if (!open) continue;                                // inline/one-line tables left alone
        // plain HTML built as a string for a print window, not JSX on screen
        if (/\b(style|class)="/.test(lines[i])) continue;

        // already inside a scroll region?
        if (lines.slice(Math.max(0, i - 3), i).some(l => SCROLLABLE.test(l))) continue;

        // find this table's close
        let close = -1;
        for (let j = i + 1; j < lines.length; j++) {
            if (/<table[\s>]/.test(lines[j])) break;        // nested/sibling table: too complex, skip
            if (/^\s*<\/table>\s*$/.test(lines[j])) { close = j; break; }
        }
        if (close === -1) { skipped++; continue; }

        // only real data tables — a header row is what makes them wide
        if (!lines.slice(i, close).some(l => /<thead[\s>]/.test(l))) { skipped++; continue; }

        const indent = open[1];
        lines.splice(close + 1, 0, `${indent}</div>`);
        lines.splice(i, 0, `${indent}<div className="overflow-x-auto">`);
        // re-indent the table body by one level so the JSX stays readable
        for (let k = i + 1; k <= close + 1; k++) lines[k] = lines[k] ? '    ' + lines[k] : lines[k];
        wrapped++;
        changed = true;
    }

    if (changed) {
        files.add(file);
        if (!DRY) writeFileSync(file, lines.join('\n'), 'utf8');
    }
}

console.log(`${DRY ? '[dry] ' : ''}tables wrapped: ${wrapped} | skipped: ${skipped} | files: ${files.size}`);
for (const f of [...files].sort()) console.log('  ' + f.split('\\').join('/'));
