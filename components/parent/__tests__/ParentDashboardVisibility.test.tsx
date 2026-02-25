
import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ParentDashboard from '../ParentDashboard';
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
    maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'p1', name: 'Test Parent', school_id: 'school-123' }, error: null })),
    single: vi.fn(() => Promise.resolve({ data: { id: 'p1', school_id: 'school-123' }, error: null })),
    then: vi.fn((cb) => cb({ data: [], error: null }))
};

vi.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'parent@demo.com', user_metadata: { role: 'parent', school_id: 'school-123' } } }, error: null }),
            getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null }),
            onAuthStateChange: vi.fn((cb) => {
                setTimeout(() => {
                    cb('SIGNED_IN', { user: { id: 'test-user', email: 'parent@demo.com', user_metadata: { role: 'parent', school_id: 'school-123' } } });
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
vi.mock('../../../lib/api', () => ({
    api: {
        getMyChildren: vi.fn().mockResolvedValue([{ id: 's1', name: 'Child One', grade: 1, section: 'A' }]),
        bulkFetchFees: vi.fn().mockResolvedValue([]),
        bulkFetchAttendance: vi.fn().mockResolvedValue([]),
        getAssignments: vi.fn().mockResolvedValue([])
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

describe('ParentDashboard Visibility', () => {
    it('renders the parent dashboard and navigation', async () => {
        render(
            <MockWrapper>
                <ParentDashboard setIsHomePage={() => {}} />
            </MockWrapper>
        );

        await waitFor(() => {
             expect(screen.queryByText(/Parent Dashboard/i)).toBeTruthy();
        }, { timeout: 10000 });

        // Verify bottom navigation items
        await waitFor(() => {
            expect(screen.getAllByText(/Home/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Fees/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Reports/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Messages/i).length).toBeGreaterThan(0);
        }, { timeout: 10000 });

        // Verify core dashboard features visible
        expect(screen.getByText(/School Utilities/i)).toBeTruthy();
        expect(screen.getByText(/Bus Route/i)).toBeTruthy();
        expect(screen.getByText(/Calendar/i)).toBeTruthy();
    }, 15000);
});
