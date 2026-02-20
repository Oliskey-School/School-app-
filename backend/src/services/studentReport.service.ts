import { supabase } from '../config/supabase';

export class StudentReportService {
    static async createAnonymousReport(schoolId: string, reportData: any) {
        const { data, error } = await supabase
            .from('anonymous_reports')
            .insert([{
                ...reportData,
                school_id: schoolId
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async createDiscreetRequest(schoolId: string, requestData: any) {
        const { data, error } = await supabase
            .from('menstrual_support_requests')
            .insert([{
                ...requestData,
                school_id: schoolId
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
