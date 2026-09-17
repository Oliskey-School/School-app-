/**
 * App-wide internationalization (i18next + react-i18next).
 *
 * - All `locales/<code>.json` files are auto-registered via Vite glob, so adding a
 *   language is just dropping in a file + a row in languages.ts.
 * - Missing keys/languages fall back to English (fallbackLng), so an untranslated
 *   language still renders a fully usable English UI instead of blank keys.
 * - Language is detected from (1) explicit choice in localStorage, (2) the browser,
 *   and applied app-wide; RTL languages flip <html dir>.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LANGUAGE, isRtlLanguage, LANGUAGES } from './languages';

// English is the fallback for every language, so it is the one locale that is
// always needed and ships in the initial bundle. Every other locale is loaded
// on demand: previously all of them were bundled eagerly, so every visitor
// downloaded nine languages' worth of strings to use one.
const englishModule = import.meta.glob('./locales/en.json', { eager: true }) as Record<string, any>;
const localeLoaders = import.meta.glob('./locales/*.json') as Record<string, () => Promise<any>>;

const resources: Record<string, { translation: any }> = {};
for (const path in englishModule) {
  resources[DEFAULT_LANGUAGE] = { translation: englishModule[path].default || englishModule[path] };
}

const loaderFor = (code: string) => localeLoaders[`./locales/${code}.json`];

/**
 * Loads one locale's strings into i18next if a file exists for it (exact code
 * first, then the base language: 'fr-CA' -> 'fr'). Resolves either way —
 * languages without a file simply keep falling back to English, as before.
 */
export async function ensureLanguageLoaded(code: string): Promise<void> {
  const candidates = [code, code.split('-')[0]];
  for (const c of candidates) {
    if (i18n.hasResourceBundle(c, 'translation')) return;
    const load = loaderFor(c);
    if (!load) continue;
    const mod = await load();
    i18n.addResourceBundle(c, 'translation', mod.default || mod, true, true);
    return;
  }
}

export const STORAGE_KEY = 'app_language';

/** Apply text direction + lang attribute for the active language. */
export function applyDirection(lng: string) {
  if (typeof document === 'undefined') return;
  const rtl = isRtlLanguage(lng);
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true, // 'en-US' resolves to 'en'
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

applyDirection(i18n.language || DEFAULT_LANGUAGE);
i18n.on('languageChanged', applyDirection);

/**
 * Resolves once the detected language's strings are available. English users
 * (the fallback is already bundled) resolve immediately; anyone else waits for
 * exactly one small locale file. index.tsx awaits this before the first render
 * so a non-English user never sees English strings swap out beneath them —
 * text direction is already applied above, from the code alone.
 */
export const i18nReady: Promise<void> = ensureLanguageLoaded(i18n.language || DEFAULT_LANGUAGE)
  .catch((err) => { console.warn('[i18n] Locale load failed, falling back to English:', err); });

/** Change language everywhere, persist locally, and flip direction. */
export async function setAppLanguage(code: string) {
  await ensureLanguageLoaded(code).catch(() => { /* falls back to English */ });
  await i18n.changeLanguage(code);
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  applyDirection(code);
}

export default i18n;
