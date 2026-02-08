import { useRealtimeQuery } from './useRealtimeQuery';

/**
 * Real-time hook for attendance records
 * Provides live attendance status updates
 */
export function useRealtimeAttendance(studentId?: string, classId?: string, date?: string) {
    return useRealtimeQuery({
        table: 'attendance',
        select: '*, students(name, school_generated_id)',
        filter: (query) => {
            if (studentId) query = query.eq('student_id', studentId);
            if (classId) query = query.eq('class_id', classId);
            if (date) query = query.eq('date', date);
            return query;
        },
        orderBy: { column: 'date', ascending: false }
    });
}

/**
 * Real-time hook for teacher attendance
 */
export function useRealtimeTeacherAttendance(teacherId?: string, date?: string) {
    return useRealtimeQuery({
        table: 'teacher_attendance',
        select: '*, teachers(name, school_generated_id)',
        filter: (query) => {
            if (teacherId) query = query.eq('teacher_id', teacherId);
            if (date) query = query.eq('date', date);
            return query;
        },
        orderBy: { column: 'date', ascending: false }
    });
}
