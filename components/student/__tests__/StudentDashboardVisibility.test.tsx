import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudentDashboard from '../StudentDashboard';
import { MemoryRouter } from 'react-router';

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
const { mockApi } = vi.hoisted(() => ({
    mockApi: {
        getMyStudentProfile: vi.fn().mockResolvedValue({
            id: 'student-123',
            name: 'Test Student',
            grade: 10,
            section: 'A',
            school_generated_id: 'STU001'
        }),
        getMyTeacherProfile: vi.fn().mockResolvedValue(null),
        getMyChildren: vi.fn().mockResolvedValue([]),
        getTimetable: vi.fn().mockResolvedValue([]),
        getAssignments: vi.fn().mockResolvedValue([]),
        getQuizzesByClass: vi.fn().mockResolvedValue([]),
        getMyDashboardOverview: vi.fn().mockResolvedValue({
            summary: {
                attendance: 95,
                averageGrade: 'A',
                completedAssignments: 10,
                pendingAssignments: 2
            },
            upcomingClasses: [],
            recentGrades: []
        }),
        getGamificationData: vi.fn().mockResolvedValue({
            points: 100,
            level: 5,
            badges: []
        }),
        // Dashboard shell polls this for the messages badge — mock so the
        // component doesn't crash on `api.getUnreadMessageCount is not a function`.
        getUnreadMessageCount: vi.fn().mockResolvedValue(0)
    }
}));

vi.mock('../../../lib/api', () => ({
    api: mockApi,
    default: mockApi
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
        // The dashboard tree reaches useNotifications -> useQuery, so it needs a
        // QueryClient in scope. The context providers are mocked above at the hook
        // level, so we provide only the query client rather than the full app shell.
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: 0 } },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <StudentDashboard setIsHomePage={vi.fn()} currentUser={mockUser} />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // 1. Wait for the dashboard shell to appear
        expect(await screen.findByText(/Student Dashboard/i, {}, { timeout: 10000 })).toBeInTheDocument();
        
        // 2. Wait for the internal content (indicating loading is finished)
        await waitFor(() => {
             // Debug: if this fails, we can see what's actually there
             // console.log(screen.debug());
             expect(screen.queryByText(/Your Focus/i)).toBeInTheDocument();
        }, { timeout: 10000 });

        expect(screen.getByText(/AI Tools/i)).toBeInTheDocument();
    });
});
