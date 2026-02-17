import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { StudentAttendance } from '../../types';

export interface UseAttendanceResult {
    attendanceRecords: StudentAttendance[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createAttendanceRecord: (record: Partial<StudentAttendance>) => Promise<StudentAttendance | null>;
    updateAttendanceRecord: (id: number, updates: Partial<StudentAttendance>) => Promise<StudentAttendance | null>;
    deleteAttendanceRecord: (id: number) => Promise<boolean>;
}

export function useAttendance(filters?: { studentId?: number; date?: string }): UseAttendanceResult {
    const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAttendance = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase.from('student_attendance').select('*');

            if (filters?.studentId) {
                query = query.eq('student_id', filters.studentId);
            }
            if (filters?.date) {
                query = query.eq('date', filters.date);
            }

            const { data, error: fetchError } = await query.order('date', { ascending: false });

            if (fetchError) throw fetchError;

            const transformedRecords: StudentAttendance[] = (data || []).map(transformSupabaseAttendance);

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

        const channel = supabase
            .channel('student-attendance-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'student_attendance' },
                (payload) => {
                    console.log('Attendance change detected:', payload);
                    fetchAttendance();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAttendance]);

    const createAttendanceRecord = async (recordData: Partial<StudentAttendance>): Promise<StudentAttendance | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('student_attendance')
                .insert([{
                    student_id: recordData.studentId,
                    date: recordData.date,
                    status: recordData.status,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseAttendance(data);
        } catch (err) {
            console.error('Error creating attendance record:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateAttendanceRecord = async (id: number, updates: Partial<StudentAttendance>): Promise<StudentAttendance | null> => {
        try {
            const { data, error: updateError } = await supabase
                .from('student_attendance')
                .update({
                    student_id: updates.studentId,
                    date: updates.date,
                    status: updates.status,
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return transformSupabaseAttendance(data);
        } catch (err) {
            console.error('Error updating attendance record:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteAttendanceRecord = async (id: number): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('student_attendance')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

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

const transformSupabaseAttendance = (a: any): StudentAttendance => ({
    id: a.id,
    studentId: a.student_id,
    date: a.date,
    status: a.status,
});
