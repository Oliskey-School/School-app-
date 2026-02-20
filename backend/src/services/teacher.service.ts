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

    static async getAllTeachers(schoolId: string) {
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });

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
}
