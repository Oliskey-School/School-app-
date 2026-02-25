
import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TeacherDashboard from '../TeacherDashboard';
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
    maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 't1', name: 'Test Teacher', school_id: 'school-123' }, error: null })),
    single: vi.fn(() => Promise.resolve({ data: { id: 't1', school_id: 'school-123' }, error: null })),
    then: vi.fn((cb) => cb({ data: [{ id: 't1', name: 'Test Teacher', school_id: 'school-123', email: 'teacher@demo.com' }], error: null }))
};

vi.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'teacher@demo.com', user_metadata: { role: 'teacher', school_id: 'school-123' } } }, error: null }),
            getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null }),
            onAuthStateChange: vi.fn((cb) => {
                setTimeout(() => {
                    cb('SIGNED_IN', { user: { id: 'test-user', email: 'teacher@demo.com', user_metadata: { role: 'teacher', school_id: 'school-123' } } });
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

describe('TeacherDashboard Visibility', () => {
    it('renders the teacher dashboard and navigation', async () => {
        render(
            <MockWrapper>
                <TeacherDashboard setIsHomePage={() => {}} />
            </MockWrapper>
        );

        // Wait for the loader to disappear or the dashboard to appear
        await waitFor(() => {
             // In Header.tsx, 'Teacher Dashboard' is replaced by 'Welcome, [userName]!' if userName exists
             const welcomeMessages = screen.queryAllByText(/Welcome/i);
             expect(welcomeMessages.length).toBeGreaterThan(0);
        }, { timeout: 10000 });

        // Verify bottom navigation / sidebar items
        await waitFor(() => {
            expect(screen.getAllByText(/Home/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Lesson Notes/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Reports/i).length).toBeGreaterThan(0);
        }, { timeout: 10000 });
    }, 15000);
});
