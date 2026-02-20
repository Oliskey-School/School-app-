import { supabase as supabaseAdmin } from '../config/supabase';

export class VirtualClassService {
    static async createSession(sessionData: any) {
        const { data, error } = await supabaseAdmin
            .from('virtual_class_sessions')
            .insert([sessionData])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }
}
