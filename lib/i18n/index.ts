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

// Eagerly bundle every locale JSON next to this file.
const modules = import.meta.glob('./locales/*.json', { eager: true }) as Record<string, any>;
const resources: Record<string, { translation: any }> = {};
for (const path in modules) {
  const code = path.replace('./locales/', '').replace('.json', '');
  resources[code] = { translation: modules[path].default || modules[path] };
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

/** Change language everywhere, persist locally, and flip direction. */
export async function setAppLanguage(code: string) {
  await i18n.changeLanguage(code);
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  applyDirection(code);
}

export default i18n;
