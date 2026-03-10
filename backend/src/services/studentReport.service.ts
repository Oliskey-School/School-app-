import { supabase } from '../config/supabase';

export class StudentReportService {
    static async createAnonymousReport(schoolId: string, branchId: string | undefined, reportData: any) {
        const insertData = {
            ...reportData,
            school_id: schoolId
        };
        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('anonymous_reports')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async createDiscreetRequest(schoolId: string, branchId: string | undefined, requestData: any) {
        const insertData = {
            ...requestData,
            school_id: schoolId
        };
        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('menstrual_support_requests')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
