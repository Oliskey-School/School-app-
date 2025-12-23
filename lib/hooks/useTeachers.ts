import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Teacher } from '../../types';
import { mockTeachers } from '../../data';

export interface UseTeachersResult {
    teachers: Teacher[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createTeacher: (teacher: Partial<Teacher>) => Promise<Teacher | null>;
    updateTeacher: (id: number, updates: Partial<Teacher>) => Promise<Teacher | null>;
    deleteTeacher: (id: number) => Promise<boolean>;
}

export function useTeachers(filters?: { status?: string; subject?: string }): UseTeachersResult {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchTeachers = useCallback(async () => {
        if (!isSupabaseConfigured) {
            // Fallback to mock data
            let filtered = [...mockTeachers];
            if (filters?.status) {
                filtered = filtered.filter(t => t.status === filters.status);
            }
            setTeachers(filtered);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            let query = supabase.from('teachers').select('*');

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error: fetchError } = await query.order('name', { ascending: true });

            if (fetchError) throw fetchError;

            // Transform Supabase data to match Teacher type
            const transformedTeachers: Teacher[] = (data || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                email: t.email,
                phone: t.phone,
                subjects: t.subjects || [],
                classes: t.classes || [],
                dateOfJoining: t.date_of_joining,
                qualification: t.qualification,
                experience: t.experience,
                address: t.address,
                gender: t.gender,
                dateOfBirth: t.date_of_birth,
                bloodGroup: t.blood_group,
                emergencyContact: t.emergency_contact,
                salary: t.salary,
                avatarUrl: t.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random`,
                status: t.status || 'Active',
                attendance: t.attendance || 98,
                performance: t.performance || 90,
            }));

            setTeachers(transformedTeachers);
            setError(null);
        } catch (err) {
            console.error('Error fetching teachers:', err);
            setError(err as Error);
            // Fallback to mock data on error
            setTeachers(mockTeachers);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTeachers();

        if (!isSupabaseConfigured) return;

        // Set up real-time subscription
        const channel = supabase
            .channel('teachers-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'teachers' },
                (payload) => {
                    console.log('Teacher change detected:', payload);
                    fetchTeachers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTeachers]);

    const createTeacher = async (teacherData: Partial<Teacher>): Promise<Teacher | null> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot create teacher');
            return null;
        }

        try {
            const { data, error: insertError } = await supabase
                .from('teachers')
                .insert([{
                    name: teacherData.name,
                    email: teacherData.email,
                    phone: teacherData.phone,
                    subjects: teacherData.subjects,
                    classes: teacherData.classes,
                    date_of_joining: teacherData.dateOfJoining,
                    qualification: teacherData.qualification,
                    experience: teacherData.experience,
                    address: teacherData.address,
                    gender: teacherData.gender,
                    date_of_birth: teacherData.dateOfBirth,
                    blood_group: teacherData.bloodGroup,
                    emergency_contact: teacherData.emergencyContact,
                    salary: teacherData.salary,
                    avatar_url: teacherData.avatarUrl,
                    status: teacherData.status || 'Active',
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return data as any;
        } catch (err) {
            console.error('Error creating teacher:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateTeacher = async (id: number, updates: Partial<Teacher>): Promise<Teacher | null> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot update teacher');
            return null;
        }

        try {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.phone !== undefined) updateData.phone = updates.phone;
            if (updates.subjects !== undefined) updateData.subjects = updates.subjects;
            if (updates.classes !== undefined) updateData.classes = updates.classes;
            if (updates.dateOfJoining !== undefined) updateData.date_of_joining = updates.dateOfJoining;
            if (updates.qualification !== undefined) updateData.qualification = updates.qualification;
            if (updates.experience !== undefined) updateData.experience = updates.experience;
            if (updates.address !== undefined) updateData.address = updates.address;
            if (updates.gender !== undefined) updateData.gender = updates.gender;
            if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth;
            if (updates.bloodGroup !== undefined) updateData.blood_group = updates.bloodGroup;
            if (updates.emergencyContact !== undefined) updateData.emergency_contact = updates.emergencyContact;
            if (updates.salary !== undefined) updateData.salary = updates.salary;
            if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
            if (updates.status !== undefined) updateData.status = updates.status;

            const { data, error: updateError } = await supabase
                .from('teachers')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return data as any;
        } catch (err) {
            console.error('Error updating teacher:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteTeacher = async (id: number): Promise<boolean> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot delete teacher');
            return false;
        }

        try {
            const { error: deleteError } = await supabase
                .from('teachers')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return true;
        } catch (err) {
            console.error('Error deleting teacher:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        teachers,
        loading,
        error,
        refetch: fetchTeachers,
        createTeacher,
        updateTeacher,
        deleteTeacher,
    };
}
