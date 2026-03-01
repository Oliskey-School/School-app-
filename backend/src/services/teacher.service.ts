import { supabase } from '../config/supabase';

export class TeacherService {
    static async createTeacher(schoolId: string, data: any) {
        const { name, email, phone, subjects, classes, avatar_url } = data;

        // 1. Create Auth User (Optional step if managed elsewhere, but good for completeness)
        // In a real app, you might want to check if user already exists

        // 2. Create Teacher Record
        const { data: teacher, error } = await supabase
            .from('teachers')
            .insert([{
                name,
                email,
                phone,
                avatar_url,
                school_id: schoolId,
                status: 'Active'
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 3. Link Subjects if provided
        if (subjects && Array.isArray(subjects)) {
            const subjectInserts = subjects.map(s => ({ teacher_id: teacher.id, subject: s }));
            await supabase.from('teacher_subjects').insert(subjectInserts);
        }

        // 4. Link Classes if provided
        if (classes && Array.isArray(classes)) {
            const classInserts = classes.map(c => ({ teacher_id: teacher.id, class_name: c }));
            await supabase.from('teacher_classes').insert(classInserts);
        }

        return teacher;
    }

    static async getAllTeachers(schoolId: string, branchId?: string) {
        let query = supabase
            .from('teachers')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('name');

        if (error) throw new Error(error.message);
        return data;
    }

    static async getTeacherById(schoolId: string, id: string) {
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('school_id', schoolId)
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async updateTeacher(schoolId: string, id: string, updates: any) {
        const { data, error } = await supabase
            .from('teachers')
            .update(updates)
            .eq('school_id', schoolId)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteTeacher(schoolId: string, id: string) {
        const { error } = await supabase
            .from('teachers')
            .delete()
            .eq('school_id', schoolId)
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }

    static async submitMyAttendance(schoolId: string, userId: string) {
        // 1. Resolve teacher ID from user ID
        const { data: teacher, error: tErr } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (tErr || !teacher) throw new Error('Teacher record not found');

        const date = new Date().toISOString().split('T')[0];
        const checkIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        const { data, error } = await supabase
            .from('teacher_attendance')
            .insert({
                teacher_id: teacher.id,
                school_id: schoolId,
                date,
                status: 'present',
                approval_status: 'pending',
                check_in: checkIn
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getMyAttendanceHistory(userId: string, limit: number = 30) {
        const { data: teacher, error: tErr } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (tErr || !teacher) throw new Error('Teacher record not found');

        const { data, error } = await supabase
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', teacher.id)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data;
    }
}
