// Generates styles/dark-theme.css — the app-wide dark theme.
//
// WHY A GENERATED OVERRIDE LAYER, NOT dark: VARIANTS IN 569 FILES
// The app styles colour with plain Tailwind utilities (bg-white, text-gray-900,
// border-gray-100, bg-blue-50 ...) in ~26,000 places. Adding a dark: twin next
// to each one would take days, drift on every new screen, and still miss
// shared components. Instead this script scans the source for every colour
// utility actually in use and emits ONE rule per class that remaps it under
// `html.dark`, so every screen — present and future — goes dark consistently.
// Re-run whenever new colour utilities appear (it is part of `npm run build`).
//
// Mapping (light → dark), chosen to keep hierarchy readable:
//   page       gray/slate-50, gray-100 body areas  → slate-950 / slate-900
//   card       white                                → slate-900
//   raised     gray-100 / gray-200                  → slate-800 / slate-700
//   text       gray-900..500                        → slate-100..400
//   borders    gray-100..300, white                 → slate-800..600
//   tints      <colour>-50/100 backgrounds          → translucent <colour>-500
//   tint text  <colour>-600..900                    → <colour>-300/200
// Solid mid/dark colours (x-500+ backgrounds, text-white) are left alone —
// they already read correctly on a dark surface.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const twColors = require('tailwindcss/colors');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- palette helpers ----------
const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const shade = (family, s) => {
    const fam = twColors[family];
    if (!fam || typeof fam !== 'object') return null;
    const v = fam[s];
    return v ? hexToRgb(v) : null;
};
const SLATE = (s) => shade('slate', s);

const NEUTRAL = new Set(['gray', 'slate', 'zinc', 'neutral', 'stone']);
const COLOURS = ['indigo', 'blue', 'violet', 'purple', 'emerald', 'green', 'rose', 'red', 'amber', 'orange', 'teal', 'cyan', 'sky', 'pink', 'fuchsia', 'lime', 'yellow'];

// light neutral shade → dark replacement (rgb triplet)
const BG_NEUTRAL = { 50: SLATE(950), 100: SLATE(800), 200: SLATE(700), 300: SLATE(600) };
const TEXT_NEUTRAL = { 900: SLATE(100), 800: SLATE(200), 700: SLATE(300), 600: SLATE(400), 500: SLATE(400), 400: SLATE(500), 300: SLATE(600), 200: SLATE(700) };
const BORDER_NEUTRAL = { 50: SLATE(800), 100: SLATE(800), 200: SLATE(700), 300: SLATE(600), 400: SLATE(500) };

/** Returns { prop, value } for a colour class, or null when it should stay as-is. */
function darkValueFor(prop, family, s, alpha) {
    const a = alpha != null ? alpha / 100 : null;
    const rgb = (t, def = 1) => `rgb(${t} / ${a ?? def})`;
    if (family === 'white') {
        if (prop === 'background-color') return rgb(SLATE(900));
        if (prop === 'border-color') return rgb(SLATE(800));
        if (prop === 'color') return null; // text-white stays white
        if (prop === '--tw-gradient-from' || prop === '--tw-gradient-to') return rgb(SLATE(900));
        return null;
    }
    if (family === 'black') {
        if (prop === 'color') return rgb(SLATE(100));
        return null; // bg-black / overlays stay
    }
    if (NEUTRAL.has(family)) {
        if (prop === 'background-color' || prop === '--tw-gradient-from' || prop === '--tw-gradient-to') return BG_NEUTRAL[s] ? rgb(BG_NEUTRAL[s]) : null;
        if (prop === 'color') return TEXT_NEUTRAL[s] ? rgb(TEXT_NEUTRAL[s]) : null;
        if (prop === 'border-color' || prop === '--tw-ring-color' || prop === '--tw-divide-color') return BORDER_NEUTRAL[s] ? rgb(BORDER_NEUTRAL[s]) : null;
        return null;
    }
    if (COLOURS.includes(family)) {
        const mid = shade(family, 500);
        if (!mid) return null;
        if (prop === 'background-color' || prop === '--tw-gradient-from' || prop === '--tw-gradient-to') {
            if (s === 50) return `rgb(${mid} / ${a ?? 0.14})`;
            if (s === 100) return `rgb(${mid} / ${a ?? 0.22})`;
            if (s === 200) return `rgb(${mid} / ${a ?? 0.3})`;
            return null;
        }
        if (prop === 'color') {
            if (s >= 800) return rgb(shade(family, 200));
            if (s >= 600) return rgb(shade(family, 300));
            return null;
        }
        if (prop === 'border-color' || prop === '--tw-ring-color' || prop === '--tw-divide-color') {
            if (s <= 200) return `rgb(${mid} / ${a ?? 0.35})`;
            if (s === 300) return `rgb(${mid} / ${a ?? 0.5})`;
            return null;
        }
    }
    return null;
}

const PROP_FOR = { bg: 'background-color', text: 'color', border: 'border-color', ring: '--tw-ring-color', divide: '--tw-divide-color', from: '--tw-gradient-from', to: '--tw-gradient-to', placeholder: 'color' };

// ---------- scan source ----------
const SCAN_DIRS = ['components', 'context', 'lib', 'hooks', 'pages'];
const SCAN_FILES = ['App.tsx', 'index.tsx', 'index.html'];
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); const st = statSync(p); if (st.isDirectory()) { if (!/node_modules|__tests__|dist/.test(f)) walk(p); } else if (/\.(tsx|ts|html)$/.test(f)) files.push(p); } };
for (const d of SCAN_DIRS) { try { walk(join(root, d)); } catch { /* optional */ } }
for (const f of SCAN_FILES) { try { statSync(join(root, f)); files.push(join(root, f)); } catch { /* optional */ } }

const classRe = /(?<![\w-])((?:[a-z0-9-]+:)*)(bg|text|border|ring|divide|from|to|placeholder)-(white|black|gray|slate|zinc|neutral|stone|indigo|blue|violet|purple|emerald|green|rose|red|amber|orange|teal|cyan|sky|pink|fuchsia|lime|yellow)(?:-(\d{2,3}))?(?:\/(\d{1,3}))?(?![\w-])/g;
const seen = new Map();
for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(classRe)) {
        const [full, variants, util, family, s, alpha] = m;
        if (variants.includes('dark:')) continue; // already handled by hand
        seen.set(full, { variants: variants.split(':').filter(Boolean), util, family, s: s ? Number(s) : null, alpha: alpha ? Number(alpha) : null });
    }
}

// ---------- variants → selector ----------
const MEDIA = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
const PSEUDO = { hover: ':hover', focus: ':focus', active: ':active', disabled: ':disabled', 'focus-within': ':focus-within', 'focus-visible': ':focus-visible', first: ':first-child', last: ':last-child', odd: ':nth-child(odd)', even: ':nth-child(even)', checked: ':checked', visited: ':visited' };
const esc = (cls) => cls.replace(/[:/.]/g, (c) => '\\' + c);

// Arbitrary hex utilities (bg-[#F0F2F5], text-[#1A1C21], ...) are not on a
// palette, so map by luminance: light backgrounds → page/card dark surfaces,
// dark text → light text, light borders → dark borders. Mid/saturated
// colours (brand purples etc.) are left alone.
const lumOf = (hex) => { const [r, g, b] = hexToRgb(hex).split(' ').map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const arbRe = /(?<![\w-])((?:[a-z0-9-]+:)*)(bg|text|border)-\[#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\](?![\w-])/g;
const seenArb = new Map();
for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(arbRe)) {
        const [full, variants, util, hex] = m;
        if (variants.includes('dark:')) continue;
        seenArb.set(full, { variants: variants.split(':').filter(Boolean), util, hex: '#' + hex });
    }
}
const arbValue = (util, hex) => {
    const L = lumOf(hex);
    if (util === 'bg' && L > 0.9) return `rgb(${SLATE(950)})`;
    if (util === 'bg' && L > 0.8) return `rgb(${SLATE(900)})`;
    if (util === 'text' && L < 0.25) return `rgb(${SLATE(100)})`;
    if (util === 'text' && L < 0.45) return `rgb(${SLATE(300)})`;
    if (util === 'border' && L > 0.8) return `rgb(${SLATE(700)})`;
    return null;
};

let emitted = 0; const skippedVariants = new Set(); const rules = [];
for (const [cls, info] of seenArb) {
    const value = arbValue(info.util, info.hex);
    if (!value || info.variants.length) continue;
    const prop = { bg: 'background-color', text: 'color', border: 'border-color' }[info.util];
    rules.push(`html.dark .${cls.replace(/[:/.[\]#]/g, (c) => '\\' + c)} { ${prop}: ${value}; }`);
    emitted++;
}
for (const [cls, info] of seen) {
    const prop = PROP_FOR[info.util];
    if (!prop) continue;
    if (info.family === 'white' || info.family === 'black') { if (info.s) continue; } else if (!info.s) continue;
    const value = darkValueFor(prop, info.family, info.s, info.alpha);
    if (!value) continue;
    let selector = `html.dark .${esc(cls)}`;
    let media = null; let ok = true; let prefix = '';
    for (const v of info.variants) {
        if (MEDIA[v]) media = MEDIA[v];
        else if (PSEUDO[v]) selector += PSEUDO[v];
        else if (v === 'group-hover') prefix = '.group:hover ';
        else if (v === 'peer-checked') prefix = '.peer:checked ~ ';
        else { ok = false; skippedVariants.add(v); }
    }
    if (!ok) continue;
    if (prefix) selector = selector.replace('html.dark ', `html.dark ${prefix}`);
    let decl;
    if (prop === '--tw-gradient-from') decl = `--tw-gradient-from: ${value} var(--tw-gradient-from-position); --tw-gradient-to: ${value.replace(/\/ [0-9.]+\)$/, '/ 0)')} var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);`;
    else if (prop === '--tw-gradient-to') decl = `--tw-gradient-to: ${value} var(--tw-gradient-to-position);`;
    else if (prop === '--tw-divide-color') { selector += ' > :not([hidden]) ~ :not([hidden])'; decl = `border-color: ${value};`; }
    else if (info.util === 'placeholder') { selector += '::placeholder'; decl = `color: ${value};`; }
    else decl = `${prop}: ${value};`;
    const rule = `${selector} { ${decl} }`;
    rules.push(media ? `@media (min-width: ${media}px) { ${rule} }` : rule);
    emitted++;
}

const base = `/* GENERATED by scripts/generate-dark-theme.mjs — do not edit by hand. */
/* Base surfaces + form controls + glass for html.dark. */
html.dark { color-scheme: dark; }
html.dark body, html.dark body.bg-gray-100 { background-color: rgb(${SLATE(950)}) !important; color: rgb(${SLATE(200)}); }
html.dark input, html.dark select, html.dark textarea { background-color: rgb(${SLATE(900)}); color: rgb(${SLATE(100)}); border-color: rgb(${SLATE(700)}); }
html.dark input::placeholder, html.dark textarea::placeholder { color: rgb(${SLATE(500)}); }
html.dark .liquid-glass, html.dark .liquid-glass-solid { background-color: rgb(${SLATE(900)}); border-color: rgb(${SLATE(800)}); }
html.dark { --lg-tint: 15 23 42; }
html.dark.glass .liquid-glass { background-color: rgb(var(--lg-tint) / var(--lg-opacity)); }
html.dark ::-webkit-scrollbar-thumb { background-color: rgb(${SLATE(700)}); }
html.dark img.invert-on-dark { filter: invert(1); }
/* Accent tint chip (used by the Appearance preview): light tint by day, translucent accent by night. */
.accent-tint-chip { background: rgb(var(--accent-100)); color: rgb(var(--accent-700)); }
html.dark .accent-tint-chip { background: rgb(var(--accent-500) / 0.2); color: rgb(var(--accent-300)); }
`;
writeFileSync(join(root, 'styles', 'dark-theme.css'), base + rules.sort().join('\n') + '\n');
console.log(`[dark-theme] scanned ${files.length} files, ${seen.size} colour classes, emitted ${emitted} dark rules` + (skippedVariants.size ? `; skipped variants: ${[...skippedVariants].join(', ')}` : ''));
