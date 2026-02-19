import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import DashboardOverview from '../DashboardOverview';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import { ProfileProvider } from '../../../context/ProfileContext';

// Mock dependencies
vi.mock('../../../lib/database', () => ({
  fetchAuditLogs: vi.fn(() => Promise.resolve([])),
  fetchDashboardStats: vi.fn(() => Promise.resolve({})),
  fetchBusRoster: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => {
      const mockQuery: any = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        filter: vi.fn(() => mockQuery),
        data: []
      };
      return mockQuery;
    }),
    rpc: vi.fn(() => Promise.resolve({ data: { context: {} } })),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user', user_metadata: { role: 'admin' } } }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user' } } }, error: null }))
    }
  },
  isSupabaseConfigured: true
}));

describe('DashboardOverview Component', () => {
  it('renders dashboard correctly', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <DashboardOverview 
              navigateTo={vi.fn()} 
              handleBack={vi.fn()} 
              forceUpdate={vi.fn()} 
              schoolId="school-123" 
              currentBranchId={null} 
            />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Check for main welcome message
    expect(screen.getByText(/Welcome, Admin!/i)).toBeInTheDocument();
  });
});
