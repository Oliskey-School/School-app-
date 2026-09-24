/**
 * Phase 2a — stop card text escaping the card on a narrow screen.
 *
 * Root cause, and it is not the column count: these cards are a flex row of an
 * icon box beside a text block. A flex item defaults to `min-width: auto`, so
 * the text block refuses to shrink below its widest word. On a phone the row's
 * minimum width exceeds the card, and because the card is `overflow: visible`
 * the label gets painted outside the rounded box — exactly what the screenshot
 * shows, with "TOTAL RECORDS" hanging off the card edge.
 *
 *   1. `min-w-0` on the text block lets it wrap inside the card instead.
 *   2. `shrink-0` on the icon box keeps the icon at its natural size, so the
 *      text is what gives way rather than the icon.
 *
 * Neither class changes anything when the row already fits, so tablet and
 * desktop are untouched.
 *
 * 3. Separately, a grid whose children are these icon+text stat cards drops to
 *    a single column on a phone, so a full-width card has room for its label.
 *    Grids of chips, swatches, game tiles and photo thumbnails are deliberately
 *    left alone — one per line would be wrong for those.
 *
 * Run: node scripts/fix-card-overflow.mjs [--dry]
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DRY = process.argv.includes('--dry');

/** The stat card: a padded rounded card laid out as an icon beside text. */
const STAT_CARD = /rounded-(?:xl|2xl|3xl)[^"`]*\bflex items-(?:center|start)[^"`]*(?:space-x-|gap-)[234]\b/;
/** Its icon, in either shape: a padded rounded wrapper, or a bare sized icon. */
const ICON_BOX = /className=(?:"|\{`)[^"`]*?\bp-\d(?:\.5)? rounded-/;
const BARE_ICON = /^\s*<[A-Z][\w.]*\s+className=(?:"|\{`)w-\d+ h-\d+\b/;
const isIcon = (line) => ICON_BOX.test(line) || BARE_ICON.test(line);
/** The text beside it: a div, paragraph or span, with or without classes. */
const TEXT_BLOCK = /^(\s*)<(?:div|p|span)(\s+className=(?:"[^"]*"|\{`[^`]*`\}))?>/;

function walk(dir) {
    let out = [];
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) out = out.concat(walk(p));
        else if (p.endsWith('.tsx')) out.push(p);
    }
    return out;
}

/**
 * Append a utility class to the FIRST element on the line — the one that is
 * actually the flex item. A line like `<div><p className="text-2xl">` carries
 * two classNames, and only the outer `<div>` is the child the parent flexes;
 * naively appending to the first `className=` found would land the class on
 * the inner `<p>`, where it does nothing.
 */
function addClass(line, cls) {
    const tag = line.match(/^(\s*)<([A-Za-z][\w.]*)/);
    if (!tag) return line;
    const head = line.slice(0, tag[0].length);
    let rest = line.slice(tag[0].length);

    // does this element already carry the class, or any className at all?
    const own = rest.match(/^((?:\s+[\w:.-]+(?:=(?:"[^"]*"|'[^']*'|\{(?:[^{}`]|`[^`]*`)*\}))?)*?)(\s+className=(?:"([^"]*)"|\{`([^`]*)`\}))/);
    if (own) {
        const existing = own[3] !== undefined ? own[3] : own[4];
        if (new RegExp('(^| )' + cls + '( |$)').test(existing)) return line;   // already there
        const replaced = own[3] !== undefined
            ? own[2].replace(`"${existing}"`, `"${existing} ${cls}"`)
            : own[2].replace('`' + existing + '`', '`' + existing + ' ' + cls + '`');
        rest = rest.slice(0, own[1].length) + replaced + rest.slice(own[0].length);
        return head + rest;
    }
    // A className this parser cannot read — typically a template literal spread
    // over several lines. Leave the element alone rather than risk emitting a
    // second className attribute, which is a hard compile error.
    if (/className=/.test(rest)) { unparsed++; return line; }

    // genuinely no className on this element yet — give it one
    return head + ` className="${cls}"` + rest;
}

let icons = 0, texts = 0, grids = 0, unparsed = 0;
const files = new Set();

for (const file of walk('components')) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const before = lines.join('\n');

    for (let i = 0; i < lines.length; i++) {
        // --- the card itself: pin the icon, let the text wrap ---
        if (STAT_CARD.test(lines[i])) {
            let iconAt = -1;
            for (let j = i; j < Math.min(i + 8, lines.length); j++) {
                if (j > i && isIcon(lines[j])) { iconAt = j; break; }
            }
            if (iconAt !== -1) {
                const pinned = addClass(lines[iconAt], 'shrink-0');
                if (pinned !== lines[iconAt]) { lines[iconAt] = pinned; icons++; }
                // the next sibling div after the icon box closes is the text block
                for (let j = iconAt + 1; j < Math.min(iconAt + 6, lines.length); j++) {
                    if (!TEXT_BLOCK.test(lines[j])) continue;
                    if (isIcon(lines[j])) continue;                 // still inside the icon
                    const shrinkable = addClass(lines[j], 'min-w-0');
                    if (shrinkable !== lines[j]) { lines[j] = shrinkable; texts++; }
                    break;
                }
            }
        }

        // --- a grid of stat cards gets one card per line on a phone ---
        if (/\bgrid-cols-2 (?=md:|lg:)/.test(lines[i])) {
            const children = lines.slice(i + 1, i + 5).join(' ');
            if (STAT_CARD.test(children) || /<StatsCard\b/.test(children)) {
                lines[i] = lines[i].replace(/\bgrid-cols-2 (?=md:|lg:)/, 'grid-cols-1 sm:grid-cols-2 ');
                grids++;
            }
        }
    }

    const after = lines.join('\n');
    if (after !== before) {
        files.add(file);
        if (!DRY) writeFileSync(file, after, 'utf8');
    }
}

console.log(`${DRY ? '[dry] ' : ''}files: ${files.size} | icons pinned: ${icons} | text blocks made shrinkable: ${texts} | stat grids single-column on phone: ${grids} | skipped (unreadable className): ${unparsed}`);
for (const f of [...files].sort()) console.log('  ' + f.split('\\').join('/'));
