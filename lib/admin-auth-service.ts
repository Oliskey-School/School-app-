import { api } from './api';
import { generateOliskeyId, UserRolePrefix } from '../utils/idFormatter';

export class AdminAuthService {
    /**
     * Creates a user account via the Backend (Service Role).
     * This allows the Admin to set the password and generate the custom ID.
     */
    static async createUser(payload: {
        schoolId: string,
        branchId: string,
        schoolSlug: string,
        branchSlug: string,
        role: 'teacher' | 'student' | 'parent',
        fullName: string,
        email?: string,
        password?: string
    }) {
        const rolePrefix: Record<string, UserRolePrefix> = {
            teacher: 'TCH',
            student: 'STU',
            parent: 'PRN'
        };

        // 1. Get next sequence number for ID
        const { count } = await api
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', payload.schoolId)
            .eq('role', payload.role);

        const customId = await generateOliskeyId(
            payload.schoolSlug,
            payload.branchSlug,
            rolePrefix[payload.role],
            (count || 0) + 1
        );

        // 2. Default password logic if none provided
        const finalPassword = payload.password || `oliskey_${Math.random().toString(36).slice(-6)}`;

        // 3. Call backend to create the Auth user (requires Service Role on backend)
        // In a real scenario, this hits an Express endpoint
        const data = await api.post('/admin/create-user', {
            ...payload,
            customId,
            password: finalPassword,
            isApproved: payload.role !== 'student' // Teachers/Parents approved by default if Admin creates them
        });

        return data;
    }

    /**
     * Admin approves a student proposed by a teacher.
     */
    static async approveStudent(studentId: string) {
        const { data, error } = await api
            .from('students')
            .update({ is_approved: true })
            .eq('id', studentId)
            .select()
            .single();

        if (error) throw error;
        
        // Notify teacher and potentially link to parent if ready
        return data;
    }

    /**
     * Links a student to a parent using the Student's Generated ID.
     */
    static async linkStudentToParent(studentGeneratedId: string, parentId: string) {
        const { data: student, error: sError } = await api
            .from('students')
            .select('id')
            .eq('school_generated_id', studentGeneratedId)
            .single();

        if (sError || !student) throw new Error('Student ID not found');

        const { error } = await api
            .from('parent_children')
            .insert({
                parent_id: parentId,
                student_id: student.id
            });

        if (error) throw error;
        return { success: true };
    }
}

