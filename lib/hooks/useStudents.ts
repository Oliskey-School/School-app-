import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { Student } from '../../types';

export interface UseStudentsResult {
    students: Student[];
    loading: boolean;
    error: unknown;
    createStudent: (newStudent: Partial<Student>) => Promise<any>;
    updateStudent: (updatedStudent: Partial<Student> & { id: string }) => Promise<any>;
    deleteStudent: (id: string) => Promise<any>;
}

export function useStudents(filters?: { schoolId?: string, grade?: number; section?: string; classId?: string }): UseStudentsResult {
    const queryKey = ['students', filters];

    const { data: students = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            if (filters?.classId) {
                return api.getStudentsByClassId(filters.classId);
            }
            if (filters?.grade && filters?.section) {
                return api.getStudentsByClass(filters.grade, filters.section, filters.schoolId);
            }
            return api.getStudents(filters?.schoolId);
        },
        enabled: !!filters?.schoolId || !!filters?.classId,
    });

    const createStudentMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (newStudent: Partial<Student>) => {
            return api.createStudent(newStudent);
        },
        updateFn: (oldData, newStudent) => [...(oldData || []), { ...newStudent, id: 'temp-' + Date.now() }],
        onSuccessMessage: "Student created successfully!",
    });

    const updateStudentMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (updatedStudent: Partial<Student> & { id: string }) => {
            return api.updateStudent(updatedStudent.id, updatedStudent);
        },
        updateFn: (oldData, updatedStudent) => (oldData || []).map((s: Student) => s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s),
        onSuccessMessage: "Student updated successfully!",
    });

    const deleteStudentMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (id: string) => {
            await api.deleteStudent(id);
            return id;
        },
        updateFn: (oldData, id) => (oldData || []).filter((s: Student) => s.id !== id),
        onSuccessMessage: "Student deleted successfully.",
    });

    return {
        students,
        loading: isLoading,
        error: error,
        createStudent: createStudentMutation.mutateAsync,
        updateStudent: updateStudentMutation.mutateAsync,
        deleteStudent: deleteStudentMutation.mutateAsync,
    };
}
