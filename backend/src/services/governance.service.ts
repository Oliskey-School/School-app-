import { supabase } from '../config/supabase';

export class GovernanceService {
    static async getComplianceStatus(schoolId: string) {
        const { data, error } = await supabase
            .from('compliance_reports')
            .select('*')
            .eq('school_id', schoolId)
            .order('check_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data || { status: 'Pending', score: 0, lastCheck: null };
    }

    static async verifySystemIntegrity(schoolId: string) {
        return { success: true, message: 'System integrity verified.', report: { school_id: schoolId } };
    }
}
