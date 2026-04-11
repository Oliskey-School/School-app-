import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { StudentAttendance } from '../../types';

export interface UseAttendanceResult {
    attendanceRecords: StudentAttendance[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createAttendanceRecord: (record: Partial<StudentAttendance>) => Promise<StudentAttendance | null>;
    updateAttendanceRecord: (id: string | number, updates: Partial<StudentAttendance>) => Promise<StudentAttendance | null>;
    deleteAttendanceRecord: (id: string | number) => Promise<boolean>;
}

export function useAttendance(filters?: { studentId?: string | number; date?: string }): UseAttendanceResult {
    const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const transformAttendance = (a: any): StudentAttendance => ({
        id: a.id,
        studentId: a.student_id,
        date: a.date,
        status: a.status
    });

    const fetchAttendance = useCallback(async () => {
        try {
            setLoading(true);
            const studentId = filters?.studentId ? String(filters.studentId) : '';
            const data = await api.getAttendanceByStudent(studentId);

            const transformedRecords: StudentAttendance[] = (data || []).map(transformAttendance);

            setAttendanceRecords(transformedRecords);
            setError(null);
        } catch (err) {
            console.error('Error fetching attendance:', err);
            setError(err as Error);
            setAttendanceRecords([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const createAttendanceRecord = async (recordData: Partial<StudentAttendance>): Promise<StudentAttendance | null> => {
        try {
            const { data, error: apiError } = await api.from('attendance').insert({
                student_id: recordData.studentId,
                date: recordData.date,
                status: recordData.status,
            });

            if (apiError) throw apiError;
            return transformAttendance(data);
        } catch (err) {
            console.error('Error creating attendance record:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateAttendanceRecord = async (id: string | number, updates: Partial<StudentAttendance>): Promise<StudentAttendance | null> => {
        try {
            const { data, error: apiError } = await api.from('attendance')
                .eq('id', String(id))
                .update({
                    student_id: updates.studentId,
                    date: updates.date,
                    status: updates.status,
                });

            if (apiError) throw apiError;
            return transformAttendance(data);
        } catch (err) {
            console.error('Error updating attendance record:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteAttendanceRecord = async (id: string | number): Promise<boolean> => {
        try {
            const { error: apiError } = await api.from('attendance')
                .eq('id', String(id))
                .delete();

            if (apiError) throw apiError;
            return true;
        } catch (err) {
            console.error('Error deleting attendance record:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        attendanceRecords,
        loading,
        error,
        refetch: fetchAttendance,
        createAttendanceRecord,
        updateAttendanceRecord,
        deleteAttendanceRecord,
    };
}
