import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminBottomNav } from '../DashboardBottomNav';

// Render labels as the real app does: translate by nav id, fall back to English.
const NAV_EN: Record<string, string> = {
    'nav.home': 'Home',
    'nav.feeManagement': 'Fee Management',
    'nav.feeManagementShort': 'Fees',
    'nav.analytics': 'Analytics',
    'nav.messages': 'Messages',
    'nav.settings': 'Settings',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: { defaultValue?: string }) =>
            NAV_EN[key] ?? opts?.defaultValue ?? key
    })
}));

const renderNav = (active = 'home') =>
    render(<AdminBottomNav activeScreen={active} setActiveScreen={vi.fn()} />);

describe('AdminBottomNav', () => {
    it('shows the five items in the owner-specified order', () => {
        renderNav();
        const labels = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'));
        expect(labels).toEqual(['Home', 'Fee Management', 'Analytics', 'Messages', 'Settings']);
    });

    it('puts Messages beside Settings', () => {
        renderNav();
        const labels = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'));
        expect(labels.indexOf('Messages')).toBe(labels.indexOf('Settings') - 1);
    });

    it('carries both a short and a full fee label, so neither breaks onto two lines', () => {
        renderNav();
        const feeButton = screen.getByRole('button', { name: 'Fee Management' });

        // Short form for narrow screens, full name once there is room.
        const short = within(feeButton).getByText('Fees');
        const full = within(feeButton).getByText('Fee Management');
        expect(short.className).toContain('sm:hidden');
        expect(full.className).toContain('hidden');
        expect(full.className).toContain('sm:inline');
    });

    it('never lets a nav label wrap', () => {
        renderNav();
        for (const button of screen.getAllByRole('button')) {
            const textSpan = button.querySelector('span');
            expect(textSpan?.className).toContain('whitespace-nowrap');
        }
    });

    it('keeps the full name available to screen readers even when the short one is shown', () => {
        renderNav();
        // aria-label is the full name; the visible spans are aria-hidden so the
        // short form is never announced.
        const feeButton = screen.getByRole('button', { name: 'Fee Management' });
        expect(within(feeButton).getByText('Fees').closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('marks the active item for assistive technology', () => {
        renderNav('feeManagement');
        expect(screen.getByRole('button', { name: 'Fee Management' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    });
});
