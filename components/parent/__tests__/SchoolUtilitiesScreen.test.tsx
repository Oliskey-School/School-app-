import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SchoolUtilitiesScreen from '../SchoolUtilitiesScreen';

describe('SchoolUtilitiesScreen — Family Referrals tile', () => {
    it('a parent sees Family Referrals and it opens the referral screen', () => {
        const navigateTo = vi.fn();
        render(<SchoolUtilitiesScreen navigateTo={navigateTo} />);
        fireEvent.click(screen.getByText('Family Referrals'));
        expect(navigateTo).toHaveBeenCalledWith('referralSystem', 'Family Referrals', {});
    });

    it('a student does not get the Family Referrals tile', () => {
        render(<SchoolUtilitiesScreen navigateTo={vi.fn()} role="student" />);
        expect(screen.queryByText('Family Referrals')).toBeNull();
        expect(screen.getByText('My Timetable')).toBeTruthy();
    });
});
