import React from 'react';
import { screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import StudentListScreen from '../StudentListScreen';
import { renderWithProviders } from '../../../test-utils';
import { api } from '../../../lib/api';

// The roster loads per class group: headcounts up front, a section's rows only
// once it is expanded, and search server-side.
vi.mock('../../../lib/api', () => ({
  api: {
    getStudentSummary: vi.fn(),
    getStudentsInClassGroup: vi.fn(),
    searchStudents: vi.fn(),
    getClasses: vi.fn().mockResolvedValue([]),
  }
}));

const mockSummary = [{ grade: 10, section: 'A', status: 'Active', count: 1 }];
const mockRows = [
  {
    id: '1',
    full_name: 'John Doe',
    school_generated_id: 'SCH-001',
    grade: 10,
    section: 'A',
    avatar_url: 'https://example.com/avatar.jpg',
    attendance_status: 'Present',
    status: 'Active',
  }
];

describe('StudentListScreen Component', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders headcounts first and fetches a class only when it is expanded', async () => {
    (api.getStudentSummary as any).mockResolvedValue(mockSummary);
    (api.getStudentsInClassGroup as any).mockResolvedValue(mockRows);

    renderWithProviders(<StudentListScreen navigateTo={vi.fn()} schoolId="school-123" />);

    const seniorAccordion = await screen.findByText(/Senior Secondary/i);
    expect(seniorAccordion).toBeDefined();
    // Nothing but the summary has been requested yet.
    expect(api.getStudentsInClassGroup).not.toHaveBeenCalled();

    seniorAccordion.click();
    const classAccordion = await screen.findByText(/SSS 1 A/i);
    expect(classAccordion).toBeDefined();
    expect(api.getStudentsInClassGroup).not.toHaveBeenCalled();

    classAccordion.click();
    const studentName = await screen.findByText(/John Doe/i);
    expect(studentName).toBeInTheDocument();
    expect(api.getStudentsInClassGroup).toHaveBeenCalledTimes(1);
    expect(api.getStudentsInClassGroup).toHaveBeenCalledWith('school-123', undefined, 10, 'A', 'All');
  });

  it('searches server-side instead of filtering a local roster', async () => {
    (api.getStudentSummary as any).mockResolvedValue(mockSummary);
    (api.searchStudents as any).mockResolvedValue(mockRows);

    const { getByLabelText } = renderWithProviders(<StudentListScreen navigateTo={vi.fn()} schoolId="school-123" />);
    await screen.findByText(/Senior Secondary/i);

    const input = getByLabelText('Search for a student') as HTMLInputElement;
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'John' } });

    const studentName = await screen.findByText(/John Doe/i, {}, { timeout: 3000 });
    expect(studentName).toBeInTheDocument();
    expect(api.searchStudents).toHaveBeenCalledWith('school-123', undefined, 'John', 'All');
    expect(api.getStudentsInClassGroup).not.toHaveBeenCalled();
  });
});
