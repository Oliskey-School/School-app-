import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../api', () => ({ api: { updateUiPreferences: vi.fn().mockResolvedValue({}) } }));

import {
    applyColorScheme, applyStatCardLayout, getColorScheme, getStatCardLayout, setPreferenceScope,
} from '../uiPreferences';

describe('appearance is per user + role, not per device', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    it('switching users keeps each user\'s own scheme and card size', () => {
        setPreferenceScope('userA:admin');
        applyColorScheme('dark');
        applyStatCardLayout('comfortable');

        setPreferenceScope('userB:teacher');
        // B never chose anything: defaults, not A's look.
        expect(getColorScheme()).toBe('light');
        expect(getStatCardLayout()).toBe('compact');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        applyColorScheme('light');

        setPreferenceScope('userA:admin');
        expect(getColorScheme()).toBe('dark');
        expect(getStatCardLayout()).toBe('comfortable');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('demo roles on one device each keep their own look', () => {
        sessionStorage.setItem('is_demo_mode', 'true');
        setPreferenceScope('demo-admin:admin');
        applyStatCardLayout('comfortable');
        setPreferenceScope('demo-parent:parent');
        expect(getStatCardLayout()).toBe('compact');
        setPreferenceScope('demo-admin:admin');
        expect(getStatCardLayout()).toBe('comfortable');
    });
});
