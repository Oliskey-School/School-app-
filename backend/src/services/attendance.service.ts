import { supabase } from '../config/supabase';

export class AttendanceService {
    static async getAttendance(schoolId: string, classId: string, date: string) {
        const { data, error } = await supabase
            .from('student_attendance')
            .select(`*, students (id, name, avatar_url)`)
            .eq('school_id', schoolId)
            .eq('class_id', classId)
            .eq('date', date);

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async saveAttendance(schoolId: string, records: any[]) {
        // records: { student_id, class_id, date, status, notes }
        const formattedRecords = records.map(r => ({
            ...r,
            school_id: schoolId
        }));

        const { data, error } = await supabase
            .from('student_attendance')
            .upsert(formattedRecords, { onConflict: 'student_id,date' })
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getAttendanceByStudent(schoolId: string, studentId: string) {
        const { data, error } = await supabase
            .from('student_attendance')
            .select('*')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .order('date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async getAttendanceByStudentIds(schoolId: string, studentIds: string[]) {
        const { data, error } = await supabase
            .from('student_attendance')
            .select('student_id, status')
            .eq('school_id', schoolId)
            .in('student_id', studentIds);

        if (error) throw new Error(error.message);
        return data || [];
    }
}
