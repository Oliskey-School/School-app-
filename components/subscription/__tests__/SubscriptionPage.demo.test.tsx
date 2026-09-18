import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubscriptionPage from '../SubscriptionPage';

/**
 * "Choose Your Plan" in DEMO mode:
 *   • no free-period banner — the demo shows the plain pay-to-unlock flow
 *   • the Free card no longer advertises a 10-user cap (rule removed everywhere)
 *   • Pay opens the Demo Checkout (no real money, no Paystack) and activation is
 *     sent with a DEMO-* reference
 *   • any number of students can be billed
 */

const { state, mockPost, mockRefresh, mockInitPayment } = vi.hoisted(() => ({
    state: { isDemo: true, planType: 'basic', isTerm1Free: true },
    mockPost: vi.fn(),
    mockRefresh: vi.fn(),
    mockInitPayment: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'OLISKEY_MAIN_ADM_0001', email: 'admin@demo.com' },
        currentSchool: { id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', plan_type: state.planType, subscription_status: 'active', student_count: 5, settings: {} },
        isDemo: state.isDemo,
        refreshCurrentSchool: mockRefresh,
    }),
}));
vi.mock('../../../context/BranchContext', () => ({ useBranch: () => ({ currentBranch: { id: 'demo-main' } }) }));
vi.mock('../../../lib/hooks/usePlanStatus', () => ({
    usePlanStatus: () => ({
        planStatus: { is_term1_free: state.isTerm1Free, current_term: 1, days_until_exam_block: null, exam_block_active: false },
    }),
}));
vi.mock('react-paystack', () => ({ usePaystackPayment: () => mockInitPayment }));
vi.mock('react-hot-toast', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../../../lib/api', () => ({
    api: {
        get: vi.fn(async (path: string) => path === '/subscription/current-term'
            ? { term: { session: '2026/2027', term: 1, resumption_date: '2026-09-14', closing_date: '2026-12-18', label: 'Term 1 — 2026/2027', is_vacation: false } }
            : null),
        post: mockPost,
        getDashboardStats: vi.fn(async () => ({ totalStudents: 5 })),
    },
}));

describe('SubscriptionPage — demo mode', () => {
    beforeEach(() => {
        state.isDemo = true; state.planType = 'basic'; state.isTerm1Free = true;
        mockPost.mockReset(); mockRefresh.mockReset(); mockInitPayment.mockReset();
        mockPost.mockResolvedValue({ school: { plan_type: 'advanced' } });
        (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY = 'pk_test_x';
    });

    it('hides the free-period banner and the 10-user cap', async () => {
        render(<SubscriptionPage />);
        expect(await screen.findByText('Choose Your Plan')).toBeInTheDocument();
        expect(screen.queryByText(/Free Period Active/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Max 10/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Limited to 10/i)).not.toBeInTheDocument();
    });

    it('opens the Demo Checkout instead of Paystack and activates with a DEMO reference', async () => {
        render(<SubscriptionPage />);
        await screen.findByText('Choose Your Plan');
        fireEvent.click(screen.getByRole('button', { name: /advanced/i }));

        fireEvent.click(screen.getByRole('button', { name: /pay|unlock/i }));
        expect(mockInitPayment).not.toHaveBeenCalled();
        expect(await screen.findByText(/no real money/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
        await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
        const [path, body] = mockPost.mock.calls[0];
        expect(path).toBe('/subscription/activate');
        expect(body.plan_type).toBe('advanced');
        expect(body.reference).toMatch(/^DEMO-/);
        await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    });

    it('lets a demo visitor bill any number of students', async () => {
        render(<SubscriptionPage />);
        await screen.findByText('Choose Your Plan');
        const input = (await screen.findByRole('spinbutton')) as HTMLInputElement;
        fireEvent.change(input, { target: { value: '5000' } });
        expect(input.value).toBe('5000');
        expect(screen.getAllByText(/₦5,000,000/).length).toBeGreaterThan(0); // 5000 × ₦1,000 Basic
    });

    it('lets a demo visitor downgrade from Advanced back to Basic', async () => {
        state.planType = 'advanced';
        render(<SubscriptionPage />);
        await screen.findByText('Choose Your Plan');
        fireEvent.click(screen.getByRole('button', { name: /^basic/i }));
        fireEvent.click(screen.getByRole('button', { name: /pay/i }));
        fireEvent.click(await screen.findByRole('button', { name: /pay now/i }));
        await waitFor(() => expect(mockPost).toHaveBeenCalled());
        expect(mockPost.mock.calls[0][1].plan_type).toBe('basic');
    });
});

describe('SubscriptionPage — live school copy', () => {
    beforeEach(() => {
        state.isDemo = false; state.planType = 'free'; state.isTerm1Free = true;
        mockPost.mockReset(); mockInitPayment.mockReset();
        (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY = 'pk_test_x';
    });

    it('says only Term 1 is free and payment starts from Term 2', async () => {
        render(<SubscriptionPage />);
        await screen.findByText('Choose Your Plan');
        expect(screen.getAllByText(/Free Period Active/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Payment is required from Term 2/i)).toBeInTheDocument();
        expect(screen.queryByText(/Term 3/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Max 10/i)).not.toBeInTheDocument();
    });

    it('uses the real Paystack checkout, not the demo popup', async () => {
        render(<SubscriptionPage />);
        await screen.findByText('Choose Your Plan');
        fireEvent.click(screen.getByRole('button', { name: /advanced/i }));
        fireEvent.click(screen.getByRole('button', { name: /unlock ai now/i }));
        expect(mockInitPayment).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/no real money/i)).not.toBeInTheDocument();
    });
});
