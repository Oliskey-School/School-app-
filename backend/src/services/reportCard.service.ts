import { supabase } from '../config/supabase';

export class ReportCardService {
    static async getReportCards(schoolId: string) {
        const { data, error } = await supabase
            .from('report_cards')
            .select('*')
            .eq('school_id', schoolId)
            .order('session', { ascending: false })
            .order('term', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async updateStatus(schoolId: string, id: string, status: string) {
        const updateData: any = { status };
        if (status === 'Published') {
            updateData.published_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('report_cards')
            .update(updateData)
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
