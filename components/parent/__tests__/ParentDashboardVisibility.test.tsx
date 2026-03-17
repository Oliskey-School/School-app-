import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ParentDashboard from '../ParentDashboard';
import { MemoryRouter } from 'react-router-dom';

// Direct Hook Mocks
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user', email: 'parent@demo.com', user_metadata: { role: 'parent' } },
        currentSchool: { id: 'school-123', name: 'Test School' },
        currentBranchId: null
    })
}));

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({ profile: { role: 'parent' }, loading: false })
}));

vi.mock('../../../context/BranchContext', () => ({
    useBranch: () => ({ currentBranch: null, branches: [] })
}));

// Mock layout and child components
vi.mock('../../../components/layout/DashboardLayout', () => ({
    default: ({ children, title }: any) => (
        <div data-testid="dashboard-layout">
            <h1>{title}</h1>
            {children}
        </div>
    )
}));

describe('ParentDashboard Visibility (Minimal)', () => {
    it('renders the parent dashboard shell', async () => {
        render(
            <MemoryRouter>
                <ParentDashboard setIsHomePage={vi.fn()} />
            </MemoryRouter>
        );

        expect(await screen.findByText('Parent Dashboard')).toBeInTheDocument();
    });
});
