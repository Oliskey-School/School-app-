import { useRealtimeQuery } from './useRealtimeQuery';

/**
 * Real-time hook for assignments
 * Automatically subscribes to assignment changes and provides live updates
 */
export function useRealtimeAssignments(teacherId?: string, classId?: string) {
    return useRealtimeQuery({
        table: 'assignments',
        select: '*',
        filter: (query) => {
            if (teacherId) query = query.eq('teacher_id', teacherId);
            if (classId) query = query.eq('class_id', classId);
            return query;
        },
        orderBy: { column: 'created_at', ascending: false }
    });
}

/**
 * Real-time hook for a single assignment's submissions
 */
export function useRealtimeAssignmentSubmissions(assignmentId: string) {
    return useRealtimeQuery({
        table: 'assignment_submissions',
        select: '*, students(name, school_generated_id)',
        filter: (query) => query.eq('assignment_id', assignmentId),
        orderBy: { column: 'submitted_at', ascending: false }
    });
}
