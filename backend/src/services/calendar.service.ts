import { supabase } from '../config/supabase';

export class CalendarService {
    static async getCalendarEvents(schoolId: string) {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('school_id', schoolId)
            .order('date');

        if (error) throw new Error(error.message);
        return data || [];
    }
}
