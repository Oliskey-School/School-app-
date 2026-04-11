import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { TimetableEntry } from '../../types';

export interface UseTimetableResult {
    timetable: TimetableEntry[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createTimetableEntry: (entry: Partial<TimetableEntry>) => Promise<TimetableEntry | null>;
    updateTimetableEntry: (id: string | number, updates: Partial<TimetableEntry>) => Promise<TimetableEntry | null>;
    deleteTimetableEntry: (id: string | number) => Promise<boolean>;
}

export function useTimetable(filters?: { className?: string; teacherId?: string | number }): UseTimetableResult {
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const transformTimetableEntry = (t: any): TimetableEntry => ({
        id: t.id,
        day: t.day,
        startTime: t.start_time,
        endTime: t.end_time,
        subject: t.subject,
        className: t.class_name,
        teacherId: t.teacher_id
    });

    const fetchTimetable = useCallback(async () => {
        try {
            setLoading(true);
            // API signature: getTimetable(branchId?: string, className?: string, teacherId?: string)
            const branchId = sessionStorage.getItem('branch_id') || undefined;
            const teacherId = filters?.teacherId ? String(filters.teacherId) : undefined;
            
            const data = await api.getTimetable(branchId, filters?.className, teacherId);

            const transformedTimetable: TimetableEntry[] = (data || []).map(transformTimetableEntry);

            setTimetable(transformedTimetable);
            setError(null);
        } catch (err) {
            console.error('Error fetching timetable:', err);
            setError(err as Error);
            setTimetable([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTimetable();
    }, [fetchTimetable]);

    const createTimetableEntry = async (entryData: Partial<TimetableEntry>): Promise<TimetableEntry | null> => {
        try {
            const data = await api.createTimetable({
                day: entryData.day,
                start_time: entryData.startTime,
                end_time: entryData.endTime,
                subject: entryData.subject,
                class_name: entryData.className,
                teacher_id: entryData.teacherId,
                school_id: sessionStorage.getItem('school_id')
            });

            return transformTimetableEntry(data);
        } catch (err) {
            console.error('Error creating timetable entry:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateTimetableEntry = async (id: string | number, updates: Partial<TimetableEntry>): Promise<TimetableEntry | null> => {
        try {
            const data = await api.updateTimetable(String(id), {
                day: updates.day,
                start_time: updates.startTime,
                end_time: updates.endTime,
                subject: updates.subject,
                class_name: updates.className,
                teacher_id: updates.teacherId,
            });

            return transformTimetableEntry(data);
        } catch (err) {
            console.error('Error updating timetable entry:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteTimetableEntry = async (id: string | number): Promise<boolean> => {
        try {
            await api.deleteTimetable(String(id));
            return true;
        } catch (err) {
            console.error('Error deleting timetable entry:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        timetable,
        loading,
        error,
        refetch: fetchTimetable,
        createTimetableEntry,
        updateTimetableEntry,
        deleteTimetableEntry,
    };
}
