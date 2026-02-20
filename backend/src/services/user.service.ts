import { supabase } from '../config/supabase';

export class UserService {
    static async createUser(schoolId: string, data: any) {
        // Ensure user is created within the tenant
        const { data: user, error } = await supabase
            .from('users')
            .insert([{ ...data, school_id: schoolId }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return user;
    }

    static async getUsers(schoolId: string, role?: string) {
        let query = supabase
            .from('users')
            .select('*')
            .eq('school_id', schoolId); // Tenant isolation

        if (role) {
            query = query.eq('role', role);
        }

        const { data: users, error } = await query;
        if (error) throw new Error(error.message);
        return users;
    }

    static async getUserById(schoolId: string, userId: string) {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .eq('school_id', schoolId) // Tenant isolation
            .single();

        if (error) throw new Error(error.message);
        return user;
    }

    static async updateUser(schoolId: string, userId: string, updates: any) {
        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .eq('school_id', schoolId) // Strict isolation
            .select()
            .single();

        if (error) throw new Error(error.message);
        return user;
    }
}
