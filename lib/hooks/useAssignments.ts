import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Assignment } from '../../types';

export interface UseAssignmentsResult {
    assignments: Assignment[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createAssignment: (assignment: Partial<Assignment>) => Promise<Assignment | null>;
    updateAssignment: (id: number, updates: Partial<Assignment>) => Promise<Assignment | null>;
    deleteAssignment: (id: number) => Promise<boolean>;
}

export function useAssignments(filters?: { className?: string; subject?: string }): UseAssignmentsResult {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase.from('assignments').select('*');

            if (filters?.className) {
                query = query.eq('class_name', filters.className);
            }
            if (filters?.subject) {
                query = query.eq('subject', filters.subject);
            }

            const { data, error: fetchError } = await query.order('due_date', { ascending: false });

            if (fetchError) throw fetchError;

            const transformedAssignments: Assignment[] = (data || []).map(transformSupabaseAssignment);

            setAssignments(transformedAssignments);
            setError(null);
        } catch (err) {
            console.error('Error fetching assignments:', err);
            setError(err as Error);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAssignments();

        const channel = supabase
            .channel('assignments-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'assignments' },
                (payload) => {
                    console.log('Assignment change detected:', payload);
                    fetchAssignments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAssignments]);

    const createAssignment = async (assignmentData: Partial<Assignment>): Promise<Assignment | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('assignments')
                .insert([{
                    title: assignmentData.title,
                    description: assignmentData.description,
                    class_name: assignmentData.className,
                    subject: assignmentData.subject,
                    due_date: assignmentData.dueDate,
                    total_students: assignmentData.totalStudents,
                    submissions_count: assignmentData.submissionsCount,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseAssignment(data);
        } catch (err) {
            console.error('Error creating assignment:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateAssignment = async (id: number, updates: Partial<Assignment>): Promise<Assignment | null> => {
        try {
            const { data, error: updateError } = await supabase
                .from('assignments')
                .update({
                    title: updates.title,
                    description: updates.description,
                    class_name: updates.className,
                    subject: updates.subject,
                    due_date: updates.dueDate,
                    total_students: updates.totalStudents,
                    submissions_count: updates.submissionsCount,
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return transformSupabaseAssignment(data);
        } catch (err) {
            console.error('Error updating assignment:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteAssignment = async (id: number): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('assignments')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return true;
        } catch (err) {
            console.error('Error deleting assignment:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        assignments,
        loading,
        error,
        refetch: fetchAssignments,
        createAssignment,
        updateAssignment,
        deleteAssignment,
    };
}

const transformSupabaseAssignment = (a: any): Assignment => ({
    id: a.id,
    title: a.title,
    description: a.description,
    className: a.class_name,
    subject: a.subject,
    dueDate: a.due_date,
    totalStudents: a.total_students,
    submissionsCount: a.submissions_count,
});
