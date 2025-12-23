import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';

export interface ClassInfo {
    id: string;
    subject: string;
    grade: number;
    section: string;
    department?: string;
    student_count?: number;
    teacher_id?: number;
    teacher_name?: string;
}

interface UseClassesResult {
    classes: ClassInfo[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createClass: (classData: Partial<ClassInfo>) => Promise<ClassInfo | null>;
    updateClass: (id: string, updates: Partial<ClassInfo>) => Promise<ClassInfo | null>;
    deleteClass: (id: string) => Promise<boolean>;
}

export function useClasses(filters?: { grade?: number; section?: string }): UseClassesResult {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchClasses = useCallback(async () => {
        if (!isSupabaseConfigured) {
            // Fallback: Generate classes for Nigerian school system
            const defaultClasses: ClassInfo[] = [];

            // Early Years (Pre-Nursery to Nursery 2)
            const earlyYears = [
                { grade: 0, name: 'PreNursery', sections: ['A', 'B'] },
                { grade: 1, name: 'Nursery1', sections: ['A', 'B'] },
                { grade: 2, name: 'Nursery2', sections: ['A', 'B'] },
            ];

            earlyYears.forEach(({ grade, name, sections }) => {
                sections.forEach(section => {
                    defaultClasses.push({
                        id: `${name}-${section}`,
                        subject: 'General',
                        grade,
                        section,
                        department: 'Early Years',
                        student_count: 0
                    });
                });
            });

            // Primary (Basic 1-6)
            for (let basic = 1; basic <= 6; basic++) {
                const grade = basic + 2; // Basic 1 = grade 3, Basic 6 = grade 8
                ['A', 'B', 'C'].forEach(section => {
                    defaultClasses.push({
                        id: `Basic${basic}-${section}`,
                        subject: 'General',
                        grade,
                        section,
                        department: 'Primary',
                        student_count: 0
                    });
                });
            }

            // Junior Secondary (JSS 1-3)
            for (let jss = 1; jss <= 3; jss++) {
                const grade = jss + 8; // JSS 1 = grade 9, JSS 3 = grade 11
                ['A', 'B', 'C'].forEach(section => {
                    defaultClasses.push({
                        id: `JSS${jss}-${section}`,
                        subject: 'General',
                        grade,
                        section,
                        department: 'Junior Secondary',
                        student_count: 0
                    });
                });
            }

            // Senior Secondary (SSS 1-3) with departments
            const departments = ['Science', 'Arts', 'Commercial'];
            for (let sss = 1; sss <= 3; sss++) {
                const grade = sss + 11; // SSS 1 = grade 12, SSS 3 = grade 14
                ['A', 'B', 'C'].forEach(section => {
                    departments.forEach(dept => {
                        defaultClasses.push({
                            id: `SSS${sss}-${section}-${dept}`,
                            subject: dept,
                            grade,
                            section,
                            department: dept,
                            student_count: 0
                        });
                    });
                });
            }

            let filtered = defaultClasses;
            if (filters?.grade) {
                filtered = filtered.filter(c => c.grade === filters.grade);
            }
            if (filters?.section) {
                filtered = filtered.filter(c => c.section === filters.section);
            }

            setClasses(filtered);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            let query = supabase.from('classes').select('*');

            if (filters?.grade) {
                query = query.eq('grade', filters.grade);
            }
            if (filters?.section) {
                query = query.eq('section', filters.section);
            }

            const { data, error: fetchError } = await query.order('grade', { ascending: true });

            if (fetchError) throw fetchError;

            const transformedClasses: ClassInfo[] = (data || []).map((c: any) => ({
                id: c.id,
                subject: c.subject,
                grade: c.grade,
                section: c.section,
                department: c.department,
                student_count: c.student_count || 0,
                teacher_id: c.teacher_id,
                teacher_name: c.teacher_name,
            }));

            setClasses(transformedClasses);
            setError(null);
        } catch (err) {
            console.error('Error fetching classes:', err);
            setError(err as Error);
            setClasses([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchClasses();

        if (!isSupabaseConfigured) return;

        // Set up real-time subscription
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
                    id: classData.id || `${classData.grade}${classData.section}-${classData.subject}`,
                    subject: classData.subject,
                    grade: classData.grade,
                    section: classData.section,
                    department: classData.department,
                    student_count: classData.student_count || 0,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return data as ClassInfo;
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
            const updateData: any = {};
            if (updates.subject !== undefined) updateData.subject = updates.subject;
            if (updates.grade !== undefined) updateData.grade = updates.grade;
            if (updates.section !== undefined) updateData.section = updates.section;
            if (updates.department !== undefined) updateData.department = updates.department;
            if (updates.student_count !== undefined) updateData.student_count = updates.student_count;

            const { data, error: updateError } = await supabase
                .from('classes')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return data as ClassInfo;
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
