import { supabase } from '../config/supabase';

export class BusService {
    static async getBuses(schoolId: string, branchId: string | undefined) {
        let query = supabase
            .from('transport_buses')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) throw new Error(error.message);

        // DEMO MODE MOCK DATA INJECTION
        const isDemoSchool = schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        if (isDemoSchool && (!data || data.length === 0)) {
            console.log('🛡️ [BusService] Injecting Demo Mock Buses');
            return [
                { id: 'b1', name: 'Bus 001', driver_name: 'John Driver', phone: '1234567890', status: 'active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' },
                { id: 'b2', name: 'Bus 002', driver_name: 'Jane Driver', phone: '0987654321', status: 'active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' },
                { id: 'b3', name: 'Bus 003', driver_name: 'Bob Driver', phone: '5554443333', status: 'inactive', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' }
            ];
        }

        return data || [];
    }

    static async createBus(schoolId: string, branchId: string | undefined, busData: any) {
        const insertData: any = { ...busData, school_id: schoolId };
        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('transport_buses')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async updateBus(schoolId: string, branchId: string | undefined, busId: string, updates: any) {
        let query = supabase
            .from('transport_buses')
            .update(updates)
            .eq('id', busId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteBus(schoolId: string, branchId: string | undefined, busId: string) {
        let query = supabase
            .from('transport_buses')
            .delete()
            .eq('id', busId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { error } = await query;

        if (error) throw new Error(error.message);
        return true;
    }
}
