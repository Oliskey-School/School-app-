import { supabase } from '../config/supabase';

export class TimetableService {
    static async getTimetable(schoolId: string, branchId: string | undefined, className?: string, teacherId?: string) {
        let query = supabase.from('timetable').select('*').eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        if (className) {
            query = query.ilike('class_name', `%${className}%`);
        }

        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }

        const { data, error } = await query.order('start_time', { ascending: true });
        if (error) throw new Error(error.message);

        // DEMO MODE MOCK DATA INJECTION
        const isDemoSchool = schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        if (isDemoSchool && (!data || data.length === 0)) {
            console.log('🛡️ [TimetableService] Injecting Demo Mock Timetable');
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            const mockEntries = [];
            for (const day of dayNames) {
                mockEntries.push(
                    { id: `tt-${day}-1`, school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f', day, start_time: '08:00', end_time: '09:00', subject: 'Mathematics', class_name: 'Grade 10A', teacher_id: 't1' },
                    { id: `tt-${day}-2`, school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f', day, start_time: '09:00', end_time: '10:00', subject: 'English Language', class_name: 'Grade 10A', teacher_id: 't2' },
                    { id: `tt-${day}-3`, school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f', day, start_time: '10:30', end_time: '11:30', subject: 'Physics', class_name: 'Grade 10A', teacher_id: 't3' }
                );
            }
            return mockEntries;
        }

        return data || [];
    }
}
