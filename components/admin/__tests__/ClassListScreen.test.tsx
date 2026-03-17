import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClassListScreen from '../ClassListScreen';
import { renderWithProviders } from '../../../test-utils';
import { api } from '../../../lib/api';

// Mock students data for expanded view
const mockStudents = [
  { id: 'student-1', name: 'John Doe', email: 'john@example.com' }
];

// Mock classes data
const mockClasses = [
  { id: 'class-1', name: 'SSS 1 A', grade: 10, section: 'A', studentCount: 15, school_id: 'school-123' },
  { id: 'class-2', name: 'SSS 2 B', grade: 11, section: 'B', studentCount: 20, school_id: 'school-123' }
];

describe('ClassListScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the API calls
    (api.getClasses as any).mockResolvedValue(mockClasses);
    (api.getStudents as any).mockResolvedValue(mockStudents);
  });

  it('renders class list correctly', async () => {
    renderWithProviders(
      <ClassListScreen 
        navigateTo={vi.fn()} 
        schoolId="school-123" 
        currentBranchId={null} 
      />
    );

    await waitFor(() => {
      // getFormattedClassName(10, 'A') -> "SSS 1 A"
      expect(screen.getByText(/SSS 1 A/i)).toBeInTheDocument();
      // getFormattedClassName(11, 'B') -> "SSS 2 B"
      expect(screen.getByText(/SSS 2 B/i)).toBeInTheDocument();
    });
  });

  it('toggles class expansion and shows students', async () => {
    renderWithProviders(
      <ClassListScreen 
        navigateTo={vi.fn()} 
        schoolId="school-123" 
        currentBranchId={null} 
      />
    );

    const classElement = await screen.findByText(/SSS 1 A/i);
    fireEvent.click(classElement);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });
});
