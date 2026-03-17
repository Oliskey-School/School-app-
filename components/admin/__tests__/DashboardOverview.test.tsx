import React from 'react';
import { screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import DashboardOverview from '../DashboardOverview';
import { renderWithProviders } from '../../../test-utils';
import { api } from '../../../lib/api';

// Mock dependencies
vi.mock('../../../lib/database', () => ({
  fetchAuditLogs: vi.fn(() => Promise.resolve([])),
  fetchBusRoster: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../lib/api');

const mockStats = {
  totalStudents: 150,
  studentTrend: 5,
  totalTeachers: 12,
  teacherTrend: 1,
  totalParents: 140,
  parentTrend: 3,
  totalClasses: 8,
  classTrend: 0,
  attendancePercentage: 92,
  recentActivity: []
};

// Note: setupTests.ts already mocks supabase globally now.

describe('DashboardOverview Component', () => {
  it('renders dashboard correctly', async () => {
    vi.mocked(api.getDashboardStats).mockResolvedValue(mockStats);

    renderWithProviders(
      <DashboardOverview
        navigateTo={vi.fn()}
        handleBack={vi.fn()}
        forceUpdate={vi.fn()}
        schoolId="school-123"
        currentBranchId={null}
        isMainBranch={true}
      />
    );

    // Check for main welcome message
    expect(await screen.findByText(/Welcome, Admin!/i)).toBeInTheDocument();
  });
});
