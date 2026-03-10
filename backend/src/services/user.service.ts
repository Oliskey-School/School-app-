import { supabase } from '../config/supabase';

export class UserService {
    static async createUser(schoolId: string, branchId: string | undefined, data: any) {
        // Ensure user is created within the tenant
        const { data: user, error } = await supabase
            .from('users')
            .insert([{ ...data, school_id: schoolId, branch_id: branchId || data.branch_id }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return user;
    }

    static async getUsers(schoolId: string, branchId: string | undefined, role?: string) {
        let query = supabase
            .from('users')
            .select('*')
            .eq('school_id', schoolId); // Tenant isolation

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        if (role) {
            query = query.eq('role', role);
        }

        const { data: users, error } = await query;
        if (error) throw new Error(error.message);
        return users;
    }

    static async getUserById(schoolId: string, branchId: string | undefined, userId: string) {
        let query = supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .eq('school_id', schoolId); // Tenant isolation

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data: user, error } = await query.single();

        if (error) throw new Error(error.message);
        return user;
    }

    static async updateUser(schoolId: string, branchId: string | undefined, userId: string, updates: any) {
        let query = supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .eq('school_id', schoolId); // Strict isolation

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data: user, error } = await query
            .select()
            .single();

        if (error) throw new Error(error.message);
        return user;
    }
}
