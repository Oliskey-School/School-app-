import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { Teacher } from '../../types';

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

    const { data: teachers = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            let data = await api.getTeachers(filters?.schoolId);

            if (filters?.status && filters.status !== 'All') {
                data = data.filter(t => t.status === filters.status);
            }

            if (filters?.subject && filters.subject !== 'All') {
                data = data.filter(t => t.subjects?.includes(filters.subject));
            }

            return data;
        },
        enabled: !!filters?.schoolId,
    });

    const createTeacherMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (newTeacher: Partial<Teacher>) => {
            return api.createTeacher(newTeacher);
        },
        updateFn: (oldData, newTeacher) => [...(oldData || []), { ...newTeacher, id: 'temp-' + Date.now() }],
        onSuccessMessage: 'Teacher created successfully!',
    });

    const updateTeacherMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (updatedTeacher: Partial<Teacher> & { id: string }) => {
            return api.updateTeacher(updatedTeacher.id, updatedTeacher);
        },
        updateFn: (oldData, updatedTeacher) => (oldData || []).map((t: Teacher) => t.id === updatedTeacher.id ? { ...t, ...updatedTeacher } : t),
        onSuccessMessage: 'Teacher updated successfully!',
    });

    const deleteTeacherMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (id: string) => {
            await api.deleteTeacher(id);
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
