import { supabase } from '../config/supabase';

export class BusService {
    static async getBuses(schoolId: string) {
        const { data, error } = await supabase
            .from('transport_buses')
            .select('*')
            .eq('school_id', schoolId)
            .order('name', { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createBus(schoolId: string, busData: any) {
        const { data, error } = await supabase
            .from('transport_buses')
            .insert([{ ...busData, school_id: schoolId }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async updateBus(schoolId: string, busId: string, updates: any) {
        const { data, error } = await supabase
            .from('transport_buses')
            .update(updates)
            .eq('id', busId)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteBus(schoolId: string, busId: string) {
        const { error } = await supabase
            .from('transport_buses')
            .delete()
            .eq('id', busId)
            .eq('school_id', schoolId);

        if (error) throw new Error(error.message);
        return true;
    }
}
