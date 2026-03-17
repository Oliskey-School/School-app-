import React from 'react';
import { screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import StudentListScreen from '../StudentListScreen';
import { renderWithProviders } from '../../../test-utils';
import { api } from '../../../lib/api';

// Mock students data specifically for this test
const mockStudents = [
  {
    id: '1',
    name: 'John Doe',
    schoolGeneratedId: 'SCH-001',
    grade: 10,
    section: 'A',
    avatarUrl: 'https://example.com/avatar.jpg',
    attendanceStatus: 'Present'
  }
];

describe('StudentListScreen Component', () => {
  it('renders student list correctly', async () => {
    vi.mocked(api.getStudents).mockResolvedValue(mockStudents);
    
    renderWithProviders(<StudentListScreen navigateTo={vi.fn()} schoolId="school-123" />);

    // Wait for student to appear
    const seniorAccordion = await screen.findByText(/Senior Secondary/i);
    expect(seniorAccordion).toBeDefined();

    // Click to open
    seniorAccordion.click();

    const classAccordion = await screen.findByText(/SSS 1 A/i);
    expect(classAccordion).toBeDefined();
    classAccordion.click();

    // Wait for student name to appear after expansion
    const studentName = await screen.findByText(/John Doe/i);
    expect(studentName).toBeInTheDocument();
  });
});
