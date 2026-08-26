import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeeStatusScreen from '../FeeStatusScreen';

const { mockApi, mockHasPaymentPlan } = vi.hoisted(() => ({
    mockApi: {
        getStudentFees: vi.fn(),
        getMyChildren: vi.fn(),
        getParentById: vi.fn(),
        getPaymentHistory: vi.fn().mockResolvedValue([])
    },
    mockHasPaymentPlan: vi.fn().mockResolvedValue(false)
}));

vi.mock('../../../lib/api', () => ({ api: mockApi }));
vi.mock('../../../lib/payments', () => ({
    hasPaymentPlan: mockHasPaymentPlan,
    recordParentGatewayPayment: vi.fn()
}));
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'parent-1', email: 'parent@example.com' },
        currentSchool: { id: 'school-1' },
        currentBranchId: null
    })
}));
vi.mock('../../../context/BranchContext', () => ({
    useBranch: () => ({ currentBranch: null, currentBranchId: null, branches: [] })
}));
vi.mock('react-hot-toast', () => {
    const toast: any = vi.fn();
    toast.success = vi.fn();
    toast.error = vi.fn();
    return { toast, default: toast };
});

const CHILD = { id: 'stu-1', name: 'Ada Obi', full_name: 'Ada Obi' };

const renderScreen = () =>
    render(<FeeStatusScreen parentId={'parent-1'} schoolId={'school-1'} navigateTo={vi.fn()} />);

beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getMyChildren.mockResolvedValue([CHILD]);
    mockApi.getParentById.mockResolvedValue({ id: 'parent-1', name: 'Parent', email: 'parent@example.com', phone: '08000000000' });
    mockHasPaymentPlan.mockResolvedValue(false);
});

describe('FeeStatusScreen — a failed load must never read as "all fees paid"', () => {
    it('shows an error with a retry when the fee fetch fails', async () => {
        mockApi.getStudentFees.mockRejectedValue(new Error('offline'));

        renderScreen();

        expect(await screen.findByRole('heading', { name: /We couldn't load the fees/i })).toBeInTheDocument();
        // The reassuring empty state must NOT be rendered on an error.
        expect(screen.queryByText(/Clear & Current/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/are fulfilled/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    it('retries the fetch and shows the fees once it succeeds', async () => {
        mockApi.getStudentFees.mockRejectedValueOnce(new Error('offline'));
        renderScreen();

        await screen.findByRole('heading', { name: /We couldn't load the fees/i });

        mockApi.getStudentFees.mockResolvedValueOnce([{
            id: 'fee-1', title: 'Term Fee', amount: 50000, paid_amount: 0,
            status: 'unpaid', due_date: '2026-09-01', student_id: 'stu-1', school_id: 'school-1'
        }]);

        fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

        expect(await screen.findByText(/Term Fee/i)).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /We couldn't load the fees/i })).not.toBeInTheDocument();
    });

    it('still shows the all-paid state when the fetch genuinely returns no fees', async () => {
        mockApi.getStudentFees.mockResolvedValue([]);

        renderScreen();

        expect(await screen.findByText(/Clear & Current/i)).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /We couldn't load the fees/i })).not.toBeInTheDocument();
    });
});

describe('FeeStatusScreen — loads once when the parent opens the page', () => {
    const FEE = {
        id: 'fee-1', title: 'Term Fee', amount: 50000, paid_amount: 0,
        status: 'unpaid', due_date: '2026-09-01', student_id: 'stu-1', school_id: 'school-1'
    };

    it('fetches the fees exactly once on open', async () => {
        mockApi.getStudentFees.mockResolvedValue([FEE]);

        renderScreen();

        expect(await screen.findByText(/Term Fee/i)).toBeInTheDocument();
        // Give every startup trigger a chance to fire.
        await new Promise(r => setTimeout(r, 300));
        expect(mockApi.getStudentFees).toHaveBeenCalledTimes(1);
    });

    it('coalesces the startup burst of realtime refreshes into the single load', async () => {
        mockApi.getStudentFees.mockResolvedValue([FEE]);

        renderScreen();
        await screen.findByText(/Term Fee/i);

        // The realtime channel commonly emits several refreshes as it connects and
        // as the branch/profile contexts settle. These must not rebuild the page.
        for (const table of ['student_fees', 'payments', '__all__']) {
            window.dispatchEvent(new CustomEvent('realtime-update', { detail: { table } }));
        }

        await new Promise(r => setTimeout(r, 300));
        expect(mockApi.getStudentFees).toHaveBeenCalledTimes(1);
    });

    it('still reloads for a genuine later update, once the window has passed', async () => {
        mockApi.getStudentFees.mockResolvedValue([FEE]);

        renderScreen();
        await screen.findByText(/Term Fee/i);
        expect(mockApi.getStudentFees).toHaveBeenCalledTimes(1);

        // Simulate a payment landing well after the page settled.
        await new Promise(r => setTimeout(r, 4100));
        window.dispatchEvent(new CustomEvent('realtime-update', { detail: { table: 'payments' } }));

        await waitFor(() => expect(mockApi.getStudentFees).toHaveBeenCalledTimes(2));
    }, 10000);
});
