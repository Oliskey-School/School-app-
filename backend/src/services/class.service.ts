import { supabase } from '../config/supabase';

export class ClassService {
    static async getClasses(schoolId: string) {
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('school_id', schoolId)
            .order('grade', { ascending: true })
            .order('section', { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createClass(schoolId: string, classData: any) {
        const { data, error } = await supabase
            .from('classes')
            .insert([{ ...classData, school_id: schoolId }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async updateClass(schoolId: string, id: string, updates: any) {
        const { data, error } = await supabase
            .from('classes')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteClass(schoolId: string, id: string) {
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (error) throw new Error(error.message);
        return true;
    }
}
