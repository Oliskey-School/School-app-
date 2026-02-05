import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { ClassInfo } from '../../types';
import { mockClasses } from '../../data';

export interface UseClassesResult {
    classes: ClassInfo[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createClass: (classInfo: Partial<ClassInfo>) => Promise<ClassInfo | null>;
    updateClass: (id: string, updates: Partial<ClassInfo>) => Promise<ClassInfo | null>;
    deleteClass: (id: string) => Promise<boolean>;
}

export function useClasses(schoolId?: string): UseClassesResult {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchClasses = useCallback(async () => {
        if (!isSupabaseConfigured) {
            setClasses(mockClasses);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            let query = supabase
                .from('classes')
                .select('*');

            if (schoolId) {
                query = query.eq('school_id', schoolId);
            }

            const { data, error: fetchError } = await query
                .order('grade', { ascending: true })
                .order('section', { ascending: true })
                .order('subject', { ascending: true });

            if (fetchError) throw fetchError;

            const transformedClasses: ClassInfo[] = (data || []).map(transformSupabaseClass);

            setClasses(transformedClasses);
            setError(null);
        } catch (err) {
            console.error('Error fetching classes:', err);
            setError(err as Error);
            setClasses(mockClasses);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClasses();

        if (!isSupabaseConfigured) return;

        const channel = supabase
            .channel('classes-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'classes' },
                (payload) => {
                    console.log('Class change detected:', payload);
                    fetchClasses();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchClasses]);

    const createClass = async (classData: Partial<ClassInfo>): Promise<ClassInfo | null> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot create class');
            return null;
        }

        try {
            const { data, error: insertError } = await supabase
                .from('classes')
                .insert([{
                    id: classData.id,
                    subject: classData.subject,
                    grade: classData.grade,
                    section: classData.section,
                    department: classData.department,
                    student_count: classData.studentCount,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseClass(data);
        } catch (err) {
            console.error('Error creating class:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateClass = async (id: string, updates: Partial<ClassInfo>): Promise<ClassInfo | null> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot update class');
            return null;
        }

        try {
            const { data, error: updateError } = await supabase
                .from('classes')
                .update({
                    subject: updates.subject,
                    grade: updates.grade,
                    section: updates.section,
                    department: updates.department,
                    student_count: updates.studentCount,
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return transformSupabaseClass(data);
        } catch (err) {
            console.error('Error updating class:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteClass = async (id: string): Promise<boolean> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot delete class');
            return false;
        }

        try {
            const { error: deleteError } = await supabase
                .from('classes')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return true;
        } catch (err) {
            console.error('Error deleting class:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        classes,
        loading,
        error,
        refetch: fetchClasses,
        createClass,
        updateClass,
        deleteClass,
    };
}

const transformSupabaseClass = (c: any): ClassInfo => ({
    id: c.id,
    subject: c.subject,
    grade: c.grade,
    section: c.section,
    department: c.department,
    studentCount: c.student_count,
});