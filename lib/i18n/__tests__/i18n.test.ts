/**
 * Regression guards for the multilingual setup: the registry stays >= 40 languages,
 * RTL detection is correct, and the English base is complete so fallback always works.
 */
import { describe, it, expect } from 'vitest';
import { LANGUAGES, isRtlLanguage } from '../languages';
import en from '../locales/en.json';

describe('i18n language registry', () => {
  it('offers at least 40 languages', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(40);
  });

  it('has unique language codes', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every language has a native name', () => {
    expect(LANGUAGES.every((l) => l.nativeName.trim().length > 0)).toBe(true);
  });

  it('detects RTL languages (Arabic, Hebrew, Urdu, Persian) and not LTR', () => {
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('he')).toBe(true);
    expect(isRtlLanguage('ur')).toBe(true);
    expect(isRtlLanguage('fa')).toBe(true);
    expect(isRtlLanguage('en')).toBe(false);
    expect(isRtlLanguage('fr')).toBe(false);
    expect(isRtlLanguage('ar-EG')).toBe(true); // region-suffixed still RTL
  });

  it('English base exposes the core namespaces used across the UI', () => {
    expect(en).toHaveProperty('common.save');
    expect(en).toHaveProperty('auth.signIn');
    expect(en).toHaveProperty('nav.home');
    expect(en).toHaveProperty('dashboard.welcome');
  });
});
