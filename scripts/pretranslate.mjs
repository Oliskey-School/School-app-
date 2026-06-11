#!/usr/bin/env node
/**
 * Pre-translate the most common app UI strings into every supported language
 * and store them in the server's shared, disk-persisted translation cache — so
 * those screens are INSTANT (and free) on a user's very first visit.
 *
 * How it works:
 *  - Source strings = every value in lib/i18n/locales/en.json + the curated
 *    list in scripts/common-ui-strings.json (dashboard tiles, buttons, labels).
 *  - It POSTs batches to the RUNNING backend (/api/translate), so the server is
 *    the single owner of the cache and persists it to backend/.cache.
 *  - Fully RESUMABLE: anything already cached is served instantly and costs no
 *    API quota, so you can run it as many times as you like — each run only
 *    fills in what's still missing.
 *  - Quota-aware: if the backend reports `degraded` (free-tier quota hit), it
 *    backs off briefly, then stops with a clear message. Just run it again
 *    later (or after enabling billing) to continue where it left off.
 *
 * Usage:
 *   node scripts/pretranslate.mjs            # all languages
 *   node scripts/pretranslate.mjs --lang fr  # one language
 *   API=http://localhost:5000 node scripts/pretranslate.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API = (process.env.API || 'http://localhost:5000') + '/api/translate';
const BATCH = 100;
const DELAY_MS = 600;       // gap between requests (gentle on rate limits)
const MAX_DEGRADED = 3;     // consecutive quota failures before stopping

// Languages to pre-fill (base codes — runtime collapses regions like zh-TW->zh).
const LANGS = [
  'es', 'fr', 'de', 'pt', 'it', 'nl', 'ru', 'uk', 'pl', 'tr',
  'zh', 'ja', 'ko', 'hi', 'bn', 'ta', 'te', 'mr', 'ur', 'ar',
  'he', 'fa', 'id', 'ms', 'th', 'vi', 'fil', 'sw', 'ha', 'yo',
  'ig', 'am', 'zu', 'af', 'el', 'ro', 'hu', 'cs', 'sv', 'fi',
  'da', 'no',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function flattenValues(obj, out = []) {
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') flattenValues(v, out);
  }
  return out;
}

function loadStrings() {
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/i18n/locales/en.json'), 'utf8'));
  const common = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/common-ui-strings.json'), 'utf8'));
  const all = [...flattenValues(en), ...common]
    // Drop interpolation-only or trivially short tokens.
    .map((s) => String(s).trim())
    .filter((s) => s.length >= 2);
  return Array.from(new Set(all));
}

async function translateChunk(texts, target) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, target }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { translations, degraded? }
}

async function run() {
  const argLang = process.argv.includes('--lang')
    ? process.argv[process.argv.indexOf('--lang') + 1]
    : null;
  const langs = argLang ? [argLang] : LANGS;
  const STRINGS = loadStrings();

  console.log(`Pre-translating ${STRINGS.length} strings × ${langs.length} languages`);
  console.log(`Endpoint: ${API}\n`);

  let totalNew = 0;
  for (const lang of langs) {
    let degradedStreak = 0;
    let sampleShown = false;
    process.stdout.write(`[${lang}] `);

    for (let i = 0; i < STRINGS.length; i += BATCH) {
      const chunk = STRINGS.slice(i, i + BATCH);
      let data;
      try {
        data = await translateChunk(chunk, lang);
      } catch (e) {
        process.stdout.write(`\n  request failed: ${e.message}\n`);
        await sleep(DELAY_MS);
        continue;
      }

      if (data.degraded) {
        degradedStreak++;
        process.stdout.write('x');
        if (degradedStreak >= MAX_DEGRADED) {
          console.log(`\n\n⚠️  Quota appears exhausted (backend degraded ${MAX_DEGRADED}× in a row).`);
          console.log('   Cached progress is saved. Re-run this script later (or after');
          console.log('   enabling billing) to continue — finished strings are skipped.\n');
          summarize(totalNew);
          return;
        }
        await sleep(2000);
        continue;
      }

      degradedStreak = 0;
      totalNew += chunk.length;
      process.stdout.write('.');
      if (!sampleShown && Array.isArray(data.translations)) {
        sampleShown = true;
        // Show one real translation so progress is visible/trustworthy.
        const idx = chunk.findIndex((s) => s.length > 4);
        if (idx >= 0) process.stdout.write(` (${chunk[idx]} → ${data.translations[idx]}) `);
      }
      await sleep(DELAY_MS);
    }
    process.stdout.write(' done\n');
  }

  console.log('\n✅ All languages processed.');
  summarize(totalNew);
}

function summarize(n) {
  console.log(`Cache now warmed (~${n} string-translations passed through this run).`);
  console.log('These strings will render instantly for users with zero API calls.');
}

run().catch((e) => { console.error(e); process.exit(1); });
