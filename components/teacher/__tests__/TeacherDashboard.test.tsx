
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TeacherDashboard from '../TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import { BranchProvider } from '../../../context/BranchContext';
import { ProfileProvider } from '../../../context/ProfileContext';

// --- Mocks ---
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'u1' }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 't1', name: 'Test Teacher' }, error: null }),
            ilike: vi.fn().mockReturnThis()
        })),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 't1', name: 'Test Teacher' }, error: null })
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'teacher@school.com' } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  },
}));

vi.mock('../../../services/RealtimeService', () => ({
    realtimeService: {
        initialize: vi.fn(),
        destroy: vi.fn()
    }
}));

// Mock child components to isolate Dashboard shell testing
vi.mock('../TeacherOverview', () => ({ default: () => <div>Overview Content</div> }));

// Mock IndexedDB
global.indexedDB = {
    open: vi.fn(),
    deleteDatabase: vi.fn(),
} as any;

describe('TeacherDashboard', () => {
  it('renders the dashboard shell correctly', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
            <ProfileProvider>
                <BranchProvider>
                    <TeacherDashboard setIsHomePage={vi.fn()} />
                </BranchProvider>
            </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify default view content
    expect(await screen.findByText('Overview Content')).toBeInTheDocument();
  });
});
