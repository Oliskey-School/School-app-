import React from 'react';
import { render, screen, waitFor, fireEvent, configure } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReferralSystem from '../ReferralSystem';

const { mockApi } = vi.hoisted(() => ({
    mockApi: {
        getMyChildren: vi.fn(),
        getMyFamilyReferrals: vi.fn(),
        createFamilyReferral: vi.fn(),
        getFamilyReferrals: vi.fn(),
        updateFamilyReferral: vi.fn(),
    },
}));

vi.mock('../../../lib/api', () => ({ api: mockApi }));
vi.mock('../../../context/BranchContext', () => ({
    useBranch: () => ({ currentBranch: null, currentBranchId: null, branches: [] }),
}));
vi.mock('react-hot-toast', () => {
    const toast: any = vi.fn();
    toast.success = vi.fn();
    toast.error = vi.fn();
    return { toast, default: toast };
});

configure({ asyncUtilTimeout: 5000 });

const CHILD = { id: 'stu-1', full_name: 'Ada Obi' };
const EXISTING = {
    id: 'ref-1', referral_type: 'Health', need_description: 'Needs glasses', urgency: 'Low',
    status: 'In Progress', is_confidential: false, created_at: '2026-10-01T10:00:00Z',
    student: { id: 'stu-1', name: 'Ada Obi' },
};

beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getMyChildren.mockResolvedValue([CHILD]);
    mockApi.getMyFamilyReferrals.mockResolvedValue([EXISTING]);
});

describe('ReferralSystem — parent', () => {
    it('lists the parent’s referrals with their status', async () => {
        render(<ReferralSystem />);
        expect(await screen.findByText('Needs glasses')).toBeTruthy();
        expect(screen.getByText('In Progress')).toBeTruthy();
        expect(screen.getByText('My Referrals (1)')).toBeTruthy();
        expect(mockApi.getMyFamilyReferrals).toHaveBeenCalled();
    });

    it('submits a referral for the chosen child and shows it in the list', async () => {
        mockApi.createFamilyReferral.mockResolvedValue({
            id: 'ref-2', referral_type: 'Learning Support', need_description: 'Reading help please',
            urgency: 'High', status: 'Submitted', is_confidential: true, created_at: '2026-10-07T10:00:00Z',
            student: { id: 'stu-1', name: 'Ada Obi' },
        });
        render(<ReferralSystem />);
        fireEvent.click(await screen.findByText('+ Submit New Referral'));

        fireEvent.change(screen.getByLabelText('Type of Need*'), { target: { value: 'Learning Support' } });
        fireEvent.change(screen.getByLabelText('Urgency Level*'), { target: { value: 'High' } });
        fireEvent.change(screen.getByLabelText('Describe the Need*'), { target: { value: '  Reading help please ' } });
        fireEvent.click(screen.getByText('Submit Referral'));

        await waitFor(() => expect(mockApi.createFamilyReferral).toHaveBeenCalledWith({
            student_id: 'stu-1',
            referral_type: 'Learning Support',
            need_description: 'Reading help please',
            urgency: 'High',
            is_confidential: true,
        }));
        expect(await screen.findByText('Reading help please')).toBeTruthy();
        expect(screen.getByText('My Referrals (2)')).toBeTruthy();
    });

    it('does not submit without a description', async () => {
        render(<ReferralSystem />);
        fireEvent.click(await screen.findByText('+ Submit New Referral'));
        fireEvent.click(screen.getByText('Submit Referral'));
        expect(mockApi.createFamilyReferral).not.toHaveBeenCalled();
    });

    it('shows an error with a retry when loading fails', async () => {
        mockApi.getMyFamilyReferrals.mockRejectedValueOnce(new Error('offline'));
        render(<ReferralSystem />);
        expect(await screen.findByText('We could not load referrals right now.')).toBeTruthy();
        fireEvent.click(screen.getByText('Try again'));
        expect(await screen.findByText('Needs glasses')).toBeTruthy();
    });
});

describe('ReferralSystem — staff', () => {
    it('lists referrals in scope and saves a status change', async () => {
        mockApi.getFamilyReferrals.mockResolvedValue([{ ...EXISTING, status: 'Submitted', parent_name: 'Mrs Obi', staff_note: null }]);
        mockApi.updateFamilyReferral.mockResolvedValue({ ...EXISTING, status: 'Resolved', staff_note: 'Done' });
        render(<ReferralSystem mode="staff" />);

        expect(await screen.findByText('Parent: Mrs Obi')).toBeTruthy();
        expect(screen.queryByText('+ Submit New Referral')).toBeNull();
        fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Resolved' } });
        fireEvent.change(screen.getByLabelText('Staff note'), { target: { value: 'Done' } });
        fireEvent.click(screen.getByText('Save update'));

        await waitFor(() => expect(mockApi.updateFamilyReferral).toHaveBeenCalledWith('ref-1', { status: 'Resolved', staff_note: 'Done' }));
        await waitFor(() => expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0));
        expect(mockApi.getMyChildren).not.toHaveBeenCalled();
    });
});
