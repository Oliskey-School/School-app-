
import React from 'react';
import { screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TeacherDashboard from '../TeacherDashboard';
import { renderWithProviders } from '../../../test-utils';

// --- Mocks ---
// Specific mocks for this test if needed, otherwise global mocks from setupTests.ts are used.
// Note: setupTests.ts already mocks supabase and realtimeService globally now.

// Mock child components to isolate Dashboard shell testing
vi.mock('../TeacherOverview', () => ({ default: () => <div>Overview Content</div> }));

describe('TeacherDashboard', () => {
  it('renders the dashboard shell correctly', async () => {
    renderWithProviders(<TeacherDashboard setIsHomePage={vi.fn()} />);

    // Verify default view content
    expect(await screen.findByText('Overview Content')).toBeInTheDocument();
  });
});
