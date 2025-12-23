import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Student } from '../../types';
import { mockStudents } from '../../data';

export interface UseStudentsResult {
    students: Student[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createStudent: (student: Partial<Student>) => Promise<Student | null>;
    updateStudent: (id: number, updates: Partial<Student>) => Promise<Student | null>;
    deleteStudent: (id: number) => Promise<boolean>;
}

export function useStudents(filters?: { grade?: number; section?: string; classId?: number }): UseStudentsResult {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchStudents = useCallback(async () => {
        if (!isSupabaseConfigured) {
            // Fallback to mock data
            let filtered = [...mockStudents];
            if (filters?.grade) {
                filtered = filtered.filter(s => s.grade === filters.grade);
            }
            if (filters?.section) {
                filtered = filtered.filter(s => s.section === filters.section);
            }
            setStudents(filtered);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            let query = supabase.from('students').select('*');

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

            // Transform Supabase data to match Student type
            const transformedStudents: Student[] = (data || []).map((s: any) => ({
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
                avatarUrl: s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
                status: s.status || 'Active',
                attendance: s.attendance || 95,
                performance: s.performance || 85,
                subjects: s.subjects || [],
                fees: s.fees || { total: 0, paid: 0, pending: 0 },
            }));

            setStudents(transformedStudents);
            setError(null);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError(err as Error);
            // Fallback to mock data on error
            setStudents(mockStudents);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchStudents();

        if (!isSupabaseConfigured) return;

        // Set up real-time subscription
        const channel = supabase
            .channel('students-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'students' },
                (payload) => {
                    console.log('Student change detected:', payload);
                    // Refetch data on any change
                    fetchStudents();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchStudents]);

    const createStudent = async (studentData: Partial<Student>): Promise<Student | null> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot create student');
            return null;
        }

        try {
            const { data, error: insertError } = await supabase
                .from('students')
                .insert([{
                    name: studentData.name,
                    email: studentData.email,
                    grade: studentData.grade,
                    section: studentData.section,
                    roll_number: studentData.rollNumber,
                    date_of_birth: studentData.dateOfBirth,
                    gender: studentData.gender,
                    address: studentData.address,
                    phone: studentData.phone,
                    parent_name: studentData.parentName,
                    parent_phone: studentData.parentPhone,
                    parent_email: studentData.parentEmail,
                    admission_date: studentData.admissionDate,
                    blood_group: studentData.bloodGroup,
                    avatar_url: studentData.avatarUrl,
                    status: studentData.status || 'Active',
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return data as any;
        } catch (err) {
            console.error('Error creating student:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateStudent = async (id: number, updates: Partial<Student>): Promise<Student | null> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot update student');
            return null;
        }

        try {
            const { data, error: updateError } = await supabase
                .from('students')
                .update({
                    name: updates.name,
                    email: updates.email,
                    grade: updates.grade,
                    section: updates.section,
                    roll_number: updates.rollNumber,
                    date_of_birth: updates.dateOfBirth,
                    gender: updates.gender,
                    address: updates.address,
                    phone: updates.phone,
                    parent_name: updates.parentName,
                    parent_phone: updates.parentPhone,
                    parent_email: updates.parentEmail,
                    blood_group: updates.bloodGroup,
                    avatar_url: updates.avatarUrl,
                    status: updates.status,
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return data as any;
        } catch (err) {
            console.error('Error updating student:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteStudent = async (id: number): Promise<boolean> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot delete student');
            return false;
        }

        try {
            const { error: deleteError } = await supabase
                .from('students')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return true;
        } catch (err) {
            console.error('Error deleting student:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        students,
        loading,
        error,
        refetch: fetchStudents,
        createStudent,
        updateStudent,
        deleteStudent,
    };
}
