import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClassListScreen from '../ClassListScreen';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import { ProfileProvider } from '../../../context/ProfileContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../../../lib/database', () => ({
  fetchClasses: vi.fn(() => Promise.resolve([
    { id: 'class-1', name: 'Grade 10A', grade: 10, section: 'A', studentCount: 15, school_id: 'school-123' },
    { id: 'class-2', name: 'Grade 11B', grade: 11, section: 'B', studentCount: 20, school_id: 'school-123' }
  ])),
  fetchStudentsByClassId: vi.fn(() => Promise.resolve([
    { id: 'student-1', name: 'John Doe', email: 'john@example.com' }
  ])),
}));

vi.mock('../../../lib/api', () => ({
  api: {
    createClass: vi.fn(() => Promise.resolve({ id: 'new-class', name: 'New Class' })),
    updateClass: vi.fn(() => Promise.resolve({ id: 'class-1', name: 'Updated Class' })),
    deleteClass: vi.fn(() => Promise.resolve()),
  }
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('ClassListScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders class list correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ProfileProvider>
              <ClassListScreen 
                navigateTo={vi.fn()} 
                schoolId="school-123" 
                currentBranchId={null} 
              />
            </ProfileProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Grade 10A/i)).toBeInTheDocument();
      expect(screen.getByText(/Grade 11B/i)).toBeInTheDocument();
    });
  });

  it('toggles class expansion and shows students', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ProfileProvider>
              <ClassListScreen 
                navigateTo={vi.fn()} 
                schoolId="school-123" 
                currentBranchId={null} 
              />
            </ProfileProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => screen.getByText(/Grade 10A/i));
    
    // Find the expansion button/area. It might be the class name or a chevron.
    // Based on the code, it uses toggleExpandClass(cls.id)
    const classElement = screen.getByText(/Grade 10A/i);
    fireEvent.click(classElement);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });
});
