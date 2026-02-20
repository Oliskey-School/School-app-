import { supabase } from '../config/supabase';

export class SchoolService {
    static async createSchool(data: any) {
        const { data: school, error } = await supabase
            .from('schools')
            .insert([data])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return school;
    }

    static async getAllSchools() {
        const { data: schools, error } = await supabase
            .from('schools')
            .select('*');

        if (error) throw new Error(error.message);
        return schools;
    }

    static async getSchoolById(id: string) {
        const { data: school, error } = await supabase
            .from('schools')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return school;
    }
    static async updateSchool(id: string, updates: any) {
        const { data: school, error } = await supabase
            .from('schools')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return school;
    }

    static async updateSchoolStatusBulk(ids: string[], status: string) {
        const { data, error } = await supabase
            .from('schools')
            .update({ status })
            .in('id', ids)
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteSchoolsBulk(ids: string[]) {
        const { error } = await supabase
            .from('schools')
            .delete()
            .in('id', ids);

        if (error) throw new Error(error.message);
        return true;
    }
}
