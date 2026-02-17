import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { TimetableEntry } from '../../types';

export interface UseTimetableResult {
    timetable: TimetableEntry[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createTimetableEntry: (entry: Partial<TimetableEntry>) => Promise<TimetableEntry | null>;
    updateTimetableEntry: (id: number, updates: Partial<TimetableEntry>) => Promise<TimetableEntry | null>;
    deleteTimetableEntry: (id: number) => Promise<boolean>;
}

export function useTimetable(filters?: { className?: string; teacherId?: number }): UseTimetableResult {
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchTimetable = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase.from('timetable').select('*');

            if (filters?.className) {
                query = query.eq('class_name', filters.className);
            }
            if (filters?.teacherId) {
                query = query.eq('teacher_id', filters.teacherId);
            }

            const { data, error: fetchError } = await query.order('start_time', { ascending: true });

            if (fetchError) throw fetchError;

            const transformedTimetable: TimetableEntry[] = (data || []).map(transformSupabaseTimetableEntry);

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

        const channel = supabase
            .channel('timetable-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'timetable' },
                (payload) => {
                    console.log('Timetable change detected:', payload);
                    fetchTimetable();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTimetable]);

    const createTimetableEntry = async (entryData: Partial<TimetableEntry>): Promise<TimetableEntry | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('timetable')
                .insert([{
                    day: entryData.day,
                    start_time: entryData.startTime,
                    end_time: entryData.endTime,
                    subject: entryData.subject,
                    class_name: entryData.className,
                    teacher_id: entryData.teacherId,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseTimetableEntry(data);
        } catch (err) {
            console.error('Error creating timetable entry:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateTimetableEntry = async (id: number, updates: Partial<TimetableEntry>): Promise<TimetableEntry | null> => {
        try {
            const { data, error: updateError } = await supabase
                .from('timetable')
                .update({
                    day: updates.day,
                    start_time: updates.startTime,
                    end_time: updates.endTime,
                    subject: updates.subject,
                    class_name: updates.className,
                    teacher_id: updates.teacherId,
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return transformSupabaseTimetableEntry(data);
        } catch (err) {
            console.error('Error updating timetable entry:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteTimetableEntry = async (id: number): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('timetable')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

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

const transformSupabaseTimetableEntry = (t: any): TimetableEntry => ({
    id: t.id,
    day: t.day,
    startTime: t.start_time,
    endTime: t.end_time,
    subject: t.subject,
    className: t.class_name,
    teacherId: t.teacher_id,
});
