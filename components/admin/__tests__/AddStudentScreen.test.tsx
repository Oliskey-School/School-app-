import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import AddStudentScreen from '../AddStudentScreen';
import { api } from '../../../lib/api';

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'admin-1' },
        currentSchool: { id: 'school-1' },
        currentBranchId: 'branch-1',
    }),
}));

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: { schoolId: 'school-1', branchId: 'branch-1', role: 'admin' },
        refreshProfile: vi.fn(),
    }),
}));

vi.mock('../../../context/BranchContext', () => ({
    useBranch: () => ({
        currentBranch: { id: 'branch-1', name: 'Main Branch' },
    }),
}));

vi.mock('../../../hooks/useTenantLimit', () => ({
    useTenantLimit: () => ({
        isLimitReached: false,
        currentCount: 1,
        maxLimit: 100,
        isPremium: true,
    }),
}));

const { mockClass, mockStudent } = vi.hoisted(() => ({
    mockClass: { id: 'class-1', name: 'SSS 3', grade: 12, section: 'A', branch_id: 'branch-1' },
    mockStudent: {
        id: 'stu-1',
        name: 'Jane Doe',
        full_name: 'Jane Doe',
        admission_number: 'ADM-001',
        department: 'Science',
        curriculum_type: 'Nigerian',
        address: '123 Street',
        gender: 'Female',
        school_bus_id: 'bus-1',
        branch_id: 'branch-1',
        // Admin previously customized this student's subjects — must survive reopening Edit.
        assigned_subjects: ['Physics', 'Chemistry'],
        enrollments: [{ class_id: 'class-1' }],
        parents: [],
    },
}));

vi.mock('../../../lib/api', () => ({
    api: {
        getStudentById: vi.fn(),
        getSubjects: vi.fn().mockResolvedValue(['Physics', 'Chemistry', 'Biology']),
        getClasses: vi.fn().mockResolvedValue([mockClass]),
        // A different list than assigned_subjects, so the test can prove auto-fill
        // does NOT clobber the student's saved picks on load.
        getClassSubjects: vi.fn().mockResolvedValue([{ name: 'Biology' }]),
        getBuses: vi.fn().mockResolvedValue([{ id: 'bus-1', name: 'Bus A' }]),
        getBranches: vi.fn().mockResolvedValue([{ id: 'branch-1', name: 'Main Branch' }]),
        getParents: vi.fn().mockResolvedValue([]),
        updateStudent: vi.fn().mockResolvedValue({}),
        syncStudentClasses: vi.fn().mockResolvedValue({}),
    },
}));

describe('AddStudentScreen (edit mode) persistence', () => {
    it('restores previously saved subjects instead of overwriting them with class defaults', async () => {
        (api.getStudentById as any).mockResolvedValue(mockStudent);

        render(
            <MemoryRouter>
                <AddStudentScreen
                    studentToEdit={mockStudent as any}
                    forceUpdate={vi.fn()}
                    handleBack={vi.fn()}
                />
            </MemoryRouter>
        );

        await screen.findByDisplayValue('Jane Doe');

        expect(screen.getByText('Physics')).toBeInTheDocument();
        expect(screen.getByText('Chemistry')).toBeInTheDocument();
        // The class's auto-fill default ('Biology') must not have overwritten the saved picks.
        expect(screen.queryByText('Biology')).not.toBeInTheDocument();
    });

    it('sends curriculum_type and school_bus_id when saving an edited student', async () => {
        (api.getStudentById as any).mockResolvedValue(mockStudent);

        render(
            <MemoryRouter>
                <AddStudentScreen
                    studentToEdit={mockStudent as any}
                    forceUpdate={vi.fn()}
                    handleBack={vi.fn()}
                />
            </MemoryRouter>
        );

        await screen.findByDisplayValue('Jane Doe');

        fireEvent.click(screen.getByRole('button', { name: /update student/i }));

        await waitFor(() => expect(api.updateStudent).toHaveBeenCalled());

        const [, payload] = (api.updateStudent as any).mock.calls[0];
        expect(payload.curriculum_type).toBe('Nigerian');
        expect(payload.school_bus_id).toBe('bus-1');
        expect(payload.subjects).toEqual(['Physics', 'Chemistry']);
    });
});
