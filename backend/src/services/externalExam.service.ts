import { supabase } from '../config/supabase';

export class ExternalExamService {
    static async getExamBodies(schoolId: string) {
        const { data, error } = await supabase
            .from('exam_bodies')
            .select('*')
            .eq('school_id', schoolId)
            .order('name');

        if (error) throw new Error(error.message);

        // DEMO MOCK
        if (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' && (!data || data.length === 0)) {
            return [
                { id: 'eb-1', name: 'West African Examinations Council', code: 'WAEC', curriculum_type: 'Nigerian' },
                { id: 'eb-2', name: 'National Examinations Council', code: 'NECO', curriculum_type: 'Nigerian' },
                { id: 'eb-3', name: 'Cambridge IGCSE', code: 'IGCSE', curriculum_type: 'British' }
            ];
        }

        return data || [];
    }

    static async createExamBody(schoolId: string, payload: any) {
        const { data, error } = await supabase
            .from('exam_bodies')
            .insert([{ ...payload, school_id: schoolId }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getExamRegistrations(bodyId: string, schoolId: string) {
        const { data, error } = await supabase
            .from('exam_registrations')
            .select('*')
            .eq('exam_body_id', bodyId)
            .eq('school_id', schoolId);

        if (error) throw new Error(error.message);

        // DEMO MOCK
        if (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' && (!data || data.length === 0)) {
            return []; // Initially empty for demo
        }

        return data || [];
    }

    static async createExamRegistrations(schoolId: string, registrations: any[]) {
        const payload = registrations.map(r => ({
            ...r,
            school_id: schoolId,
            status: r.status || 'registered'
        }));

        const { data, error } = await supabase
            .from('exam_registrations')
            .insert(payload)
            .select();

        if (error) throw new Error(error.message);
        return data;
    }
}
