import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TeacherDashboard from '../TeacherDashboard';
import { MemoryRouter } from 'react-router-dom';

// Direct Hook Mocks
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user', email: 'teacher@demo.com', user_metadata: { role: 'teacher' } },
        currentSchool: { id: 'school-123', name: 'Test School' },
        currentBranchId: null
    })
}));

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({ profile: { role: 'teacher' }, loading: false })
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

// Mock API
vi.mock('../../../lib/api', () => ({
    api: {
        getMyTeacherProfile: vi.fn().mockResolvedValue({ id: 'teacher-123', name: 'Test Teacher' })
    }
}));

// Mock ALL views imported in TeacherDashboard to prevent them from running their own effects
vi.mock('../TeacherOverview', () => ({ default: () => <div>Overview Content</div> }));

describe('TeacherDashboard Visibility (Minimal)', () => {
    it('renders the teacher dashboard shell', async () => {
        render(
            <MemoryRouter>
                <TeacherDashboard setIsHomePage={vi.fn()} />
            </MemoryRouter>
        );

        // Check for title in the layout
        expect(await screen.findByText('Teacher Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Overview Content')).toBeInTheDocument();
    });
});
