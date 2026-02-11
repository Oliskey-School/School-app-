import { useRealtimeQuery } from './useRealtimeQuery';

/**
 * Real-time hook for notices/announcements
 * Provides instant notice delivery to students and teachers
 */
export function useRealtimeNotices(classId?: string, role?: 'student' | 'teacher') {
    return useRealtimeQuery({
        table: 'notices',
        select: '*, author:users(name, avatar_url)',
        filter: (query) => {
            if (classId) query = query.eq('class_id', classId);
            if (role) query = query.eq('target_role', role);
            return query;
        },
        orderBy: { column: 'timestamp', ascending: false }
    });
}

/**
 * Real-time hook for school-wide announcements
 */
export function useRealtimeAnnouncements(schoolId: string) {
    return useRealtimeQuery({
        table: 'announcements',
        select: '*',
        filter: (query) => query.eq('school_id', schoolId),
        orderBy: { column: 'created_at', ascending: false }
    });
}
