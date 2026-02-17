import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import StudentListScreen from '../StudentListScreen';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import { ProfileProvider } from '../../../context/ProfileContext';

// Mock dependencies
vi.mock('../../../lib/database', () => ({
  fetchStudents: vi.fn(() => Promise.resolve([
    {
      id: '1',
      name: 'John Doe',
      schoolGeneratedId: 'SCH-001',
      grade: 10,
      section: 'A',
      avatarUrl: 'https://example.com/avatar.jpg',
      attendanceStatus: 'Present'
    }
  ]))
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user', user_metadata: { role: 'admin' } } }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user' } } }, error: null }))
    }
  }
}));

describe('StudentListScreen Component', () => {
  it('renders student list correctly', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <StudentListScreen navigateTo={vi.fn()} schoolId="school-123" />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for student to appear
    const seniorAccordion = await screen.findByText(/Senior Secondary/i);
    seniorAccordion.click();

    // Click the class sub-accordion (Grade 10 -> SSS 1)
    const classAccordion = await screen.findByText(/SSS 1/i);
    classAccordion.click();

    expect(await screen.findByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/SCH-001/i)).toBeInTheDocument();
  });
});
