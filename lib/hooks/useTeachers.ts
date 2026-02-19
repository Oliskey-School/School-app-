import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { Teacher } from '../../types';

const transformSupabaseTeacher = (t: any): Teacher => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    subjects: t.teacher_subjects?.map((ts: any) => ts.subject) || [],
    classes: t.teacher_classes?.map((tc: any) => tc.class_name) || [],
    dateOfJoining: t.date_of_joining,
    qualification: t.qualification,
    experience: t.experience,
    address: t.address,
    gender: t.gender,
    dateOfBirth: t.date_of_birth,
    bloodGroup: t.blood_group,
    emergencyContact: t.emergency_contact,
    salary: t.salary,
    avatarUrl: t.avatar_url,
    status: t.status || 'Active',
    schoolId: t.school_id,
    schoolGeneratedId: t.school_generated_id,
});

export interface UseTeachersResult {
    teachers: Teacher[];
    loading: boolean;
    error: unknown;
    createTeacher: (newTeacher: Partial<Teacher>) => Promise<any>;
    updateTeacher: (updatedTeacher: Partial<Teacher> & { id: string }) => Promise<any>;
    deleteTeacher: (id: string) => Promise<any>;
}

export function useTeachers(filters?: { schoolId?: string; status?: string; subject?: string }): UseTeachersResult {
    const queryKey = ['teachers', filters];

    const { data: teachers = [], isLoading, isError, error } = useQuery({
        queryKey,
        queryFn: async () => {
            let query = supabase
                .from('teachers')
                .select('id, name, email, phone, avatar_url, status, school_id, school_generated_id, date_of_joining, qualification, experience, address, gender, date_of_birth, blood_group, emergency_contact, salary, teacher_subjects(subject), teacher_classes(class_name)');

            if (filters?.schoolId) {
                query = query.eq('school_id', filters.schoolId);
            }
            if (filters?.status && filters.status !== 'All') {
                query = query.eq('status', filters.status);
            }
            // Note: Filtering by subject would require a database function or view for optimal performance
            // if we are checking against the `teacher_subjects` join table.
            // A simple client-side filter is applied below for now.

            const { data, error: fetchError } = await query.order('name', { ascending: true });

            if (fetchError) throw fetchError;
            
            let transformed = (data || []).map(transformSupabaseTeacher);

            if (filters?.subject && filters.subject !== 'All') {
                transformed = transformed.filter(t => t.subjects.includes(filters.subject!));
            }

            return transformed;
        },
        enabled: !!filters?.schoolId,
    });

    const createTeacherMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (newTeacher: Partial<Teacher>) => {
            const { data, error } = await supabase.from('teachers').insert([newTeacher]).select().single();
            if (error) throw error;
            return transformSupabaseTeacher(data);
        },
        updateFn: (oldData, newTeacher) => [...(oldData || []), { ...newTeacher, id: 'temp-' + Date.now() }],
        onSuccessMessage: 'Teacher created successfully!',
    });

    const updateTeacherMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (updatedTeacher: Partial<Teacher> & { id: string }) => {
            const { id, ...updates } = updatedTeacher;
            const { data, error } = await supabase.from('teachers').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return transformSupabaseTeacher(data);
        },
        updateFn: (oldData, updatedTeacher) => (oldData || []).map((t: Teacher) => t.id === updatedTeacher.id ? { ...t, ...updatedTeacher } : t),
        onSuccessMessage: 'Teacher updated successfully!',
    });

    const deleteTeacherMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('teachers').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        updateFn: (oldData, id) => (oldData || []).filter((t: Teacher) => t.id !== id),
        onSuccessMessage: 'Teacher deleted successfully.',
    });

    return {
        teachers,
        loading: isLoading,
        error,
        createTeacher: createTeacherMutation.mutateAsync,
        updateTeacher: updateTeacherMutation.mutateAsync,
        deleteTeacher: deleteTeacherMutation.mutateAsync,
    };
}
