
import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StudentDashboard from '../StudentDashboard';
import { AuthProvider } from '../../../context/AuthContext';
import { ProfileProvider } from '../../../context/ProfileContext';
import { BranchProvider } from '../../../context/BranchContext';
import { BrowserRouter } from 'react-router-dom';

// Robust Mock for Supabase
const mockQuery: any = {
    select: vi.fn(() => mockQuery),
    eq: vi.fn(() => mockQuery),
    order: vi.fn(() => mockQuery),
    limit: vi.fn(() => mockQuery),
    insert: vi.fn(() => mockQuery),
    upsert: vi.fn(() => mockQuery),
    update: vi.fn(() => mockQuery),
    delete: vi.fn(() => mockQuery),
    or: vi.fn(() => mockQuery),
    filter: vi.fn(() => mockQuery),
    ilike: vi.fn(() => mockQuery),
    maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 's1', name: 'Test Student', grade: 10, section: 'A' }, error: null })),
    single: vi.fn(() => Promise.resolve({ data: { id: 's1', school_id: 'school-123' }, error: null })),
    then: vi.fn((cb) => cb({ data: [], error: null }))
};

vi.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'student@demo.com', user_metadata: { role: 'student', school_id: 'school-123' } } }, error: null }),
            getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null }),
            onAuthStateChange: vi.fn((cb) => {
                setTimeout(() => {
                    cb('SIGNED_IN', { user: { id: 'test-user', email: 'student@demo.com', user_metadata: { role: 'student', school_id: 'school-123' } } });
                }, 0);
                return { data: { subscription: { unsubscribe: vi.fn() } } };
            })
        },
        from: vi.fn(() => mockQuery),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis()
        })),
        removeChannel: vi.fn(),
        rpc: vi.fn(() => Promise.resolve({ data: { context: {} } }))
    },
    isSupabaseConfigured: true
}));

vi.mock('../../../services/RealtimeService', () => ({
    realtimeService: {
        initialize: vi.fn(),
        destroy: vi.fn()
    }
}));

vi.mock('../../../lib/syncEngine', () => ({
    syncEngine: {
        on: vi.fn(),
        off: vi.fn()
    }
}));

// Mock API
vi.mock('../../../lib/api', () => {
    const mockApi = {
        getMyStudentProfile: vi.fn().mockResolvedValue({ id: 's1', name: 'Test Student', grade: 10, section: 'A', avatar_url: '' }),
        getAssignments: vi.fn().mockResolvedValue([]),
        bulkFetchFees: vi.fn().mockResolvedValue([]),
        bulkFetchAttendance: vi.fn().mockResolvedValue([]),
        getStudentPerformance: vi.fn().mockResolvedValue([]),
        getQuizResults: vi.fn().mockResolvedValue([]),
        getTimetable: vi.fn().mockResolvedValue([]),
        getQuizzesByClass: vi.fn().mockResolvedValue([])
    };
    return {
        api: mockApi,
        default: mockApi
    };
});

// Mock offline storage
vi.mock('../../../lib/offlineStorage', () => ({
    offlineStorage: {
        load: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(true)
    }
}));

const MockWrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
        <AuthProvider>
            <ProfileProvider>
                <BranchProvider>
                    <Suspense fallback={<div>Loading...</div>}>
                        {children}
                    </Suspense>
                </BranchProvider>
            </ProfileProvider>
        </AuthProvider>
    </BrowserRouter>
);

describe('StudentDashboard Visibility', () => {
    const mockUser = { id: 'test-user', email: 'student@demo.com', user_metadata: { full_name: 'Test Student' } };

    it('renders the student dashboard and primary features', async () => {
        render(
            <MockWrapper>
                <StudentDashboard setIsHomePage={() => {}} currentUser={mockUser} />
            </MockWrapper>
        );

        // Wait for the loader to disappear and overview to load
        await waitFor(() => {
             // Look for 'Student Dashboard' in the header
             expect(screen.queryByText(/Student Dashboard/i)).toBeTruthy();
             // Look for 'Quick Actions' to know Overview is rendered
             expect(screen.queryByText(/Quick Actions/i)).toBeTruthy();
        }, { timeout: 10000 });

        // Verify key features visible
        expect(screen.getByText(/AI Tools/i)).toBeTruthy();
        
        // Verify quick access items
        expect(screen.getAllByText(/Subjects/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Timetable/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Games/i).length).toBeGreaterThan(0);

        // Verify bottom navigation items are present
        expect(screen.getAllByText(/Home/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Results/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Quizzes/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Messages/i).length).toBeGreaterThan(0);
    }, 15000);
});
