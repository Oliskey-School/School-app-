import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeacherMarkAttendanceScreen from '../TeacherAttendanceScreen';

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({ profile: { schoolId: 'school-1', branchId: 'branch-1' } })
}));

vi.mock('../../../hooks/useAutoSync', () => ({
    useAutoSync: () => {}
}));

let mockBranches: any[] = [];
vi.mock('../../../context/BranchContext', () => ({
    useBranch: () => ({ branches: mockBranches })
}));

vi.mock('../../../lib/api', () => ({
    api: {
        getStudents: vi.fn().mockResolvedValue([{ id: 'stu-1', full_name: 'Ada Lovelace' }]),
        getAttendance: vi.fn((_classId: string, date: string) => {
            const attendanceByDate: Record<string, any[]> = {
                '2026-08-04': [{ student_id: 'stu-1', status: 'absent' }],
                '2026-08-05': [{ student_id: 'stu-1', status: 'present' }],
            };
            return Promise.resolve(attendanceByDate[date] || []);
        }),
        saveAttendance: vi.fn().mockResolvedValue({}),
    }
}));

import { api } from '../../../lib/api';

const students = [{ id: 'stu-1', full_name: 'Ada Lovelace' }];
const attendanceByDate: Record<string, any[]> = {
    '2026-08-04': [{ student_id: 'stu-1', status: 'absent' }],
    '2026-08-05': [{ student_id: 'stu-1', status: 'present' }],
};

const classInfo = { id: 'class-1', grade: 'SSS 1', section: 'A', schoolId: 'school-1' } as any;

describe('TeacherMarkAttendanceScreen date switching', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        mockBranches = [];
        (api.getStudents as any).mockResolvedValue(students);
        (api.getAttendance as any).mockImplementation((_classId: string, date: string) =>
            Promise.resolve(attendanceByDate[date] || [])
        );
    });

    it('shows each date\'s own saved record instead of a stale local draft', async () => {
        render(<TeacherMarkAttendanceScreen classInfo={classInfo} currentBranchId="branch-1" />);

        // Initial load = today's date (mocked as no record -> defaults to Present)
        await waitFor(() => expect(api.getAttendance).toHaveBeenCalled());

        const dateInput = await screen.findByDisplayValue(/\d{4}-\d{2}-\d{2}/);

        // Switch to a date with a saved "Absent" record.
        fireEvent.change(dateInput, { target: { value: '2026-08-04' } });
        await waitFor(() => expect(screen.getByText('Status: Absent')).toBeInTheDocument());

        // Switch to a different date with a saved "Present" record — must reflect
        // THAT date's record, not whatever was last shown (this was the bug: a
        // stale localStorage draft from a prior visit silently overrode fresh data).
        fireEvent.change(dateInput, { target: { value: '2026-08-05' } });
        await waitFor(() => expect(screen.getByText('Status: Present')).toBeInTheDocument());

        // Switching back to the Absent date must show Absent again, proving the
        // component always trusts the freshly-fetched server record per date.
        fireEvent.change(dateInput, { target: { value: '2026-08-04' } });
        await waitFor(() => expect(screen.getByText('Status: Absent')).toBeInTheDocument());
    });

    it('does not let an unsaved edit leak back in when revisiting the same date', async () => {
        render(<TeacherMarkAttendanceScreen classInfo={classInfo} currentBranchId="branch-1" />);

        const dateInput = await screen.findByDisplayValue(/\d{4}-\d{2}-\d{2}/);

        // Go to the Present-record date and make an UNSAVED in-memory edit to Absent.
        fireEvent.change(dateInput, { target: { value: '2026-08-05' } });
        await waitFor(() => expect(screen.getByText('Status: Present')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'A' }));
        await waitFor(() => expect(screen.getByText('Status: Absent')).toBeInTheDocument());

        // Navigate away without saving, then come back to the same date.
        fireEvent.change(dateInput, { target: { value: '2026-08-04' } });
        await waitFor(() => expect(screen.getByText('Status: Absent')).toBeInTheDocument());

        fireEvent.change(dateInput, { target: { value: '2026-08-05' } });
        // Must show the true saved record (Present) again, not the discarded
        // unsaved edit — the old code re-applied a localStorage draft here.
        await waitFor(() => expect(screen.getByText('Status: Present')).toBeInTheDocument());
    });
});

describe('TeacherMarkAttendanceScreen curriculum track filter', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        (api.getStudents as any).mockResolvedValue([
            { id: 'stu-1', full_name: 'Ada Lovelace', curriculum_type: 'Nigerian' },
            { id: 'stu-2', full_name: 'Grace Hopper', curriculum_type: 'British' },
        ]);
        (api.getAttendance as any).mockResolvedValue([]);
    });

    it('hides the curriculum dropdown for a single-curriculum branch', async () => {
        mockBranches = [{ id: 'branch-1', curriculum_type: 'nigerian' }];
        render(<TeacherMarkAttendanceScreen classInfo={classInfo} currentBranchId="branch-1" />);

        await screen.findByText('Ada Lovelace');
        expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
        expect(screen.queryByText('All Curricula')).not.toBeInTheDocument();
    });

    it('filters students by curriculum track for a dual-curriculum branch', async () => {
        mockBranches = [{ id: 'branch-1', curriculum_type: 'dual' }];
        render(<TeacherMarkAttendanceScreen classInfo={classInfo} currentBranchId="branch-1" />);

        await screen.findByText('Ada Lovelace');
        expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

        const trackSelect = screen.getByDisplayValue('All Curricula');
        fireEvent.change(trackSelect, { target: { value: 'Nigerian' } });

        await waitFor(() => expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument());
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    });

    it('shows a "Both" curriculum student under every track, on every date', async () => {
        mockBranches = [{ id: 'branch-1', curriculum_type: 'dual' }];
        (api.getStudents as any).mockResolvedValue([
            { id: 'stu-1', full_name: 'Ada Lovelace', curriculum_type: 'Nigerian' },
            { id: 'stu-2', full_name: 'Grace Hopper', curriculum_type: 'British' },
            { id: 'stu-3', full_name: 'Ola Student', curriculum_type: 'Both' },
        ]);
        (api.getAttendance as any).mockImplementation((_classId: string, date: string) =>
            Promise.resolve(attendanceByDate[date] || [])
        );

        render(<TeacherMarkAttendanceScreen classInfo={classInfo} currentBranchId="branch-1" />);
        await screen.findByText('Ola Student');

        const trackSelect = screen.getByDisplayValue('All Curricula');
        const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);

        // Nigerian track: Ola shows alongside Ada, not Grace.
        fireEvent.change(trackSelect, { target: { value: 'Nigerian' } });
        await waitFor(() => expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument());
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('Ola Student')).toBeInTheDocument();

        // British track: Ola shows alongside Grace, not Ada.
        fireEvent.change(trackSelect, { target: { value: 'British' } });
        await waitFor(() => expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument());
        expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
        expect(screen.getByText('Ola Student')).toBeInTheDocument();

        // Switching the date while filtered must still keep Ola visible on the
        // British track — the curriculum filter must survive a date change.
        fireEvent.change(dateInput, { target: { value: '2026-08-05' } });
        await waitFor(() => expect(api.getAttendance).toHaveBeenCalledWith('class-1', '2026-08-05'));
        expect(screen.getByText('Ola Student')).toBeInTheDocument();
        expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    });
});
