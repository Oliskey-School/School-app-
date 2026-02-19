import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { Student } from '../../types';

// Helper function to transform Supabase student data to our Student type
const transformSupabaseStudent = (s: any): Student => ({
    id: s.id,
    name: s.name,
    email: s.email,
    grade: s.grade,
    section: s.section,
    rollNumber: s.roll_number,
    dateOfBirth: s.date_of_birth,
    gender: s.gender,
    address: s.address,
    phone: s.phone,
    parentName: s.parent_name,
    parentPhone: s.parent_phone,
    parentEmail: s.parent_email,
    admissionDate: s.admission_date,
    bloodGroup: s.blood_group,
    avatarUrl: s.avatar_url,
    status: s.status || 'Active',
    attendanceStatus: s.attendance_status || 'Present',
    schoolId: s.school_id,
    schoolGeneratedId: s.school_generated_id,
    branchId: s.branch_id,
});

export interface UseStudentsResult {
    students: Student[];
    loading: boolean;
    error: unknown;
    createStudent: (newStudent: Partial<Student>) => Promise<any>;
    updateStudent: (updatedStudent: Partial<Student> & { id: string }) => Promise<any>;
    deleteStudent: (id: string) => Promise<any>;
}

export function useStudents(filters?: { schoolId?: string, grade?: number; section?: string; classId?: number }): UseStudentsResult {
    const queryKey = ['students', filters];

    const { data: students = [], isLoading, isError, error } = useQuery({
        queryKey,
        queryFn: async () => {
            let query = supabase
                .from('students')
                .select('id, name, email, grade, section, roll_number, date_of_birth, gender, address, phone, parent_name, parent_phone, parent_email, admission_date, blood_group, avatar_url, status, attendance_status, school_id, school_generated_id, branch_id');

            if (filters?.schoolId) {
                query = query.eq('school_id', filters.schoolId);
            }
            if (filters?.grade) {
                query = query.eq('grade', filters.grade);
            }
            if (filters?.section) {
                query = query.eq('section', filters.section);
            }
            if (filters?.classId) {
                query = query.eq('class_id', filters.classId);
            }

            const { data, error: fetchError } = await query.order('name', { ascending: true });

            if (fetchError) throw fetchError;

            return (data || []).map(transformSupabaseStudent);
        },
        enabled: !!filters?.schoolId, // Only run query if schoolId is provided
    });

    const createStudentMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (newStudent: Partial<Student>) => {
            const { data, error } = await supabase.from('students').insert([newStudent]).select().single();
            if (error) throw error;
            return transformSupabaseStudent(data);
        },
        updateFn: (oldData, newStudent) => [...(oldData || []), { ...newStudent, id: 'temp-' + Date.now() }],
        onSuccessMessage: "Student created successfully!",
    });

    const updateStudentMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (updatedStudent: Partial<Student> & { id: string }) => {
            const { data, error } = await supabase.from('students').update(updatedStudent).eq('id', updatedStudent.id).select().single();
            if (error) throw error;
            return transformSupabaseStudent(data);
        },
        updateFn: (oldData, updatedStudent) => (oldData || []).map((s: Student) => s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s),
        onSuccessMessage: "Student updated successfully!",
    });

    const deleteStudentMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
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


