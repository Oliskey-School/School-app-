import { describe, it, expect } from 'vitest';
import { isTranslatable } from '../autoTranslate';

describe('auto-translate exclusion rules', () => {
    it('translates normal UI text', () => {
        expect(isTranslatable('Total Students')).toBe(true);
        expect(isTranslatable('Mark Attendance')).toBe(true);
        expect(isTranslatable('Welcome back')).toBe(true);
    });

    it('skips Global IDs (never translate the school ID format)', () => {
        expect(isTranslatable('SCH01_BR02_TCH_005')).toBe(false);
        expect(isTranslatable('EXCEL_MAIN_STU_0001')).toBe(false);
    });

    it('skips emails and URLs', () => {
        expect(isTranslatable('john@school.com')).toBe(false);
        expect(isTranslatable('https://oliskey.com/portal')).toBe(false);
        expect(isTranslatable('www.example.com')).toBe(false);
    });

    it('skips pure numbers / money / punctuation', () => {
        expect(isTranslatable('1234')).toBe(false);
        expect(isTranslatable('₦25,000')).toBe(false);
        expect(isTranslatable('100%')).toBe(false);
        expect(isTranslatable('—')).toBe(false);
    });

    it('skips trivially short fragments', () => {
        expect(isTranslatable('A')).toBe(false);
        expect(isTranslatable('')).toBe(false);
    });
});
