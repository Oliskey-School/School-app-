import { supabase } from '../config/supabase';

export class AttendanceService {
    static async getAttendance(schoolId: string, branchId: string | undefined, classId: string, date: string) {
        let query = supabase
            .from('student_attendance')
            .select(`*, students (id, name, avatar_url)`)
            .eq('school_id', schoolId)
            .eq('class_id', classId)
            .eq('date', date);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        // DEMO MOCK
        if (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' && (!data || data.length === 0)) {
            return [
                { id: 'm1', student_id: 's1', status: 'Present', date, students: { id: 's1', name: 'John Doe', avatar_url: null } },
                { id: 'm2', student_id: 's2', status: 'Absent', date, students: { id: 's2', name: 'Jane Smith', avatar_url: null } },
                { id: 'm3', student_id: 's3', status: 'Present', date, students: { id: 's3', name: 'Bob Johnson', avatar_url: null } }
            ];
        }

        return data || [];
    }

    static async saveAttendance(schoolId: string, branchId: string | undefined, records: any[]) {
        // records: { student_id, class_id, date, status, notes }
        const formattedRecords = records.map(r => {
            const formatted: any = {
                ...r,
                school_id: schoolId
            };
            if (branchId && branchId !== 'all') {
                formatted.branch_id = branchId;
            }
            return formatted;
        });

        const { data, error } = await supabase
            .from('student_attendance')
            .upsert(formattedRecords, { onConflict: 'student_id,date' })
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getAttendanceByStudent(schoolId: string, branchId: string | undefined, studentId: string) {
        let query = supabase
            .from('student_attendance')
            .select('*')
            .eq('school_id', schoolId)
            .eq('student_id', studentId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async getAttendanceByStudentIds(schoolId: string, branchId: string | undefined, studentIds: string[]) {
        let query = supabase
            .from('student_attendance')
            .select('student_id, status')
            .eq('school_id', schoolId)
            .in('student_id', studentIds);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);
        return data || [];
    }
}
