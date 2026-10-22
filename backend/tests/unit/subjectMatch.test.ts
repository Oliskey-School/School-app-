import { describe, it, expect } from 'vitest';
import { subjectAllowed, subjectNamesMatch, departmentAllows } from '../../src/utils/subjectMatch';

describe('subject name matching (student subject lists vs teacher subjects)', () => {
    it('matches the same subject regardless of case and punctuation', () => {
        expect(subjectNamesMatch('Mathematics', 'mathematics')).toBe(true);
        expect(subjectNamesMatch('Computer Studies/ICT', 'computer studies ict')).toBe(true);
    });
    it('matches a qualified name against its base name', () => {
        expect(subjectNamesMatch('General Mathematics', 'Mathematics')).toBe(true);
        expect(subjectNamesMatch('ICT', 'Computer Studies/ICT')).toBe(true);
        expect(subjectNamesMatch('English Language', 'English')).toBe(true);
    });
    it('does not match unrelated subjects or partial words', () => {
        expect(subjectNamesMatch('Mathematics', 'Physics')).toBe(false);
        expect(subjectNamesMatch('Art', 'Arts and Crafts')).toBe(false); // "art" is not the whole word "arts"
        expect(subjectNamesMatch('', 'Mathematics')).toBe(false);
    });
    it('an empty student list means every subject is allowed', () => {
        expect(subjectAllowed('Mathematics', [])).toBe(true);
        expect(subjectAllowed('Mathematics', null)).toBe(true);
        expect(subjectAllowed('Mathematics', ['General Mathematics', 'Biology'])).toBe(true);
        expect(subjectAllowed('Physics', ['General Mathematics', 'Biology'])).toBe(false);
    });
});

describe('departmentAllows', () => {
    it('no department on the subject = every student', () => {
        expect(departmentAllows(null, 'Arts')).toBe(true);
        expect(departmentAllows('', null)).toBe(true);
        expect(departmentAllows('  ', 'Science')).toBe(true);
    });
    it('matches trimmed and case-insensitive; a student without a department is excluded', () => {
        expect(departmentAllows('Science', ' science ')).toBe(true);
        expect(departmentAllows('Science', 'Arts')).toBe(false);
        expect(departmentAllows('Science', null)).toBe(false);
    });
});
