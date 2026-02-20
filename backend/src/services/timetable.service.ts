import { supabase } from '../config/supabase';

export class TimetableService {
    static async getTimetable(schoolId: string, className?: string, teacherId?: string) {
        let query = supabase.from('timetable').select('*').eq('school_id', schoolId);
        
        if (className) {
            query = query.ilike('class_name', `%${className}%`);
        }
        
        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }

        const { data, error } = await query.order('start_time', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    }
}
