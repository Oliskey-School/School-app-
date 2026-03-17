import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StudentDashboard from '../StudentDashboard';
import { MemoryRouter } from 'react-router-dom';

// Direct Hook Mocks
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user', email: 'student@demo.com', user_metadata: { role: 'student' } },
        currentSchool: { id: 'school-123', name: 'Test School' },
        currentBranchId: null
    })
}));

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({ profile: { role: 'student' }, loading: false })
}));

vi.mock('../../../context/BranchContext', () => ({
    useBranch: () => ({ currentBranch: null, branches: [] })
}));

// Mock API and Storage to bypass loaders
vi.mock('../../../lib/api', () => ({
    api: {
        getMyStudentProfile: vi.fn().mockResolvedValue({
            id: 'student-123',
            name: 'Test Student',
            grade: 10,
            section: 'A',
            school_generated_id: 'STU001'
        }),
        getTimetable: vi.fn().mockResolvedValue([]),
        getAssignments: vi.fn().mockResolvedValue([]),
        getQuizzesByClass: vi.fn().mockResolvedValue([])
    }
}));

vi.mock('../../../lib/offlineStorage', () => ({
    offlineStorage: {
        load: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(true)
    }
}));

// Mock layout
vi.mock('../../../components/layout/DashboardLayout', () => ({
    default: ({ children, title }: any) => (
        <div data-testid="dashboard-layout">
            <h1>{title}</h1>
            <div data-testid="dashboard-content">{children}</div>
        </div>
    )
}));

describe('StudentDashboard Visibility (Minimal)', () => {
    const mockUser = { id: 'test-user', email: 'student@demo.com', user_metadata: { full_name: 'Test Student' } };

    it('renders the student dashboard shell and internal overview', async () => {
        render(
            <MemoryRouter>
                <StudentDashboard setIsHomePage={vi.fn()} currentUser={mockUser} />
            </MemoryRouter>
        );

        // 1. Wait for the dashboard shell to appear
        expect(await screen.findByText(/Student Dashboard/i, {}, { timeout: 10000 })).toBeInTheDocument();
        
        // 2. Wait for the internal content (indicating loading is finished)
        await waitFor(() => {
             // Debug: if this fails, we can see what's actually there
             // console.log(screen.debug());
             expect(screen.queryByText(/Today's Focus/i)).toBeInTheDocument();
        }, { timeout: 10000 });

        expect(screen.getByText(/AI Tools/i)).toBeInTheDocument();
    });
});
