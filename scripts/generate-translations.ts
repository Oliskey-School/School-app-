/**
 * Fills in translation files for every language in lib/i18n/languages.ts using the
 * Gemini API, translating from the English base (lib/i18n/locales/en.json).
 *
 * Usage:
 *   GEMINI_API_KEY=xxx npx tsx scripts/generate-translations.ts            # only missing langs
 *   GEMINI_API_KEY=xxx npx tsx scripts/generate-translations.ts --all      # overwrite all
 *   GEMINI_API_KEY=xxx npx tsx scripts/generate-translations.ts es fr ar   # specific langs
 *
 * The English file and any hand-curated language files are the source of truth; this
 * only generates the languages you ask for (or those without a file). Review output
 * before shipping — machine translation is a strong starting point, not final.
 */
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LANGUAGES } from '../lib/i18n/languages';

const LOCALES_DIR = path.join(__dirname, '..', 'lib', 'i18n', 'locales');
const EN = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'));

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('Set GEMINI_API_KEY (or VITE_GEMINI_API_KEY) to run the generator.');
  process.exit(1);
}
const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-flash' });

const args = process.argv.slice(2);
const all = args.includes('--all');
const onlyCodes = args.filter((a) => !a.startsWith('--'));

async function translate(langName: string, code: string): Promise<any> {
  const prompt =
    `Translate the VALUES of this JSON into ${langName} (code: ${code}) for a school ` +
    `management app UI. Keep keys identical. Keep {{placeholders}} and punctuation like ` +
    `"?" / "!" intact. Return ONLY valid JSON, no markdown fences.\n\n` +
    JSON.stringify(EN, null, 2);
  const res = await model.generateContent(prompt);
  const text = res.response.text().replace(/```json\s*|\s*```/g, '').trim();
  return JSON.parse(text);
}

(async () => {
  const targets = LANGUAGES.filter((l) => l.code !== 'en').filter((l) => {
    if (onlyCodes.length) return onlyCodes.includes(l.code);
    if (all) return true;
    return !fs.existsSync(path.join(LOCALES_DIR, `${l.code}.json`)); // only missing
  });

  console.log(`Generating ${targets.length} language file(s)...`);
  for (const l of targets) {
    try {
      const json = await translate(l.name, l.code);
      fs.writeFileSync(
        path.join(LOCALES_DIR, `${l.code}.json`),
        JSON.stringify(json, null, 2) + '\n',
        'utf8',
      );
      console.log(`  ✓ ${l.code} (${l.name})`);
    } catch (e: any) {
      console.error(`  ✗ ${l.code} (${l.name}): ${e.message}`);
    }
  }
  console.log('Done. Review the generated files before shipping.');
})();
