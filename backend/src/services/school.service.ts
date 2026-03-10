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

    static async getSchoolById(schoolId: string, id: string) {
        const { data: school, error } = await supabase
            .from('schools')
            .select('*')
            .eq('id', id)
            .eq('id', schoolId) // Double check against user's school
            .single();

        if (error) throw new Error(error.message);
        return school;
    }
    static async updateSchool(schoolId: string, id: string, updates: any) {
        const { data: school, error } = await supabase
            .from('schools')
            .update(updates)
            .eq('id', id)
            .eq('id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return school;
    }

    static async updateSchoolStatusBulk(schoolId: string, ids: string[], status: string) {
        const { data, error } = await supabase
            .from('schools')
            .update({ status })
            .in('id', ids)
            .eq('id', schoolId) // Assuming ids refers to schools, this is a bit redundant if it's the user's own school, but safe. 
            // If they are updating multiple SCHOOLS, they must have superadmin rights or it must be scoped.
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteSchoolsBulk(schoolId: string, ids: string[]) {
        const { error } = await supabase
            .from('schools')
            .delete()
            .in('id', ids)
            .eq('id', schoolId);

        if (error) throw new Error(error.message);
        return true;
    }

    static async getBranches(schoolId: string) {
        const { data: branches, error } = await supabase
            .from('branches')
            .select('*')
            .eq('school_id', schoolId)
            .order('is_main', { ascending: false });

        if (error) throw new Error(error.message);
        return branches;
    }

    static async createBranch(schoolId: string, data: any) {
        const { data: branch, error } = await supabase
            .from('branches')
            .insert([{ ...data, school_id: schoolId }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return branch;
    }

    static async updateBranch(schoolId: string, id: string, updates: any) {
        // Ensure we don't accidentally update school_id
        const sanitizedUpdates = { ...updates };
        delete sanitizedUpdates.school_id;

        const { data: branch, error } = await supabase
            .from('branches')
            .update(sanitizedUpdates)
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return branch;
    }

    static async deleteBranch(schoolId: string, id: string) {
        // WARNING: Ensure real RLS handles cascading if needed, or backend checks
        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (error) throw new Error(error.message);
        return true;
    }
}
