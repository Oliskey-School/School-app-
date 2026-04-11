import { syncEngine } from './syncEngine';
import { api } from './api';
import { offlineDB } from './dexie-db';

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceBulkRecord {
    student_id: string;
    status: AttendanceStatus;
    school_id: string;
    date: string;
}

/**
 * High-Speed Bulk Attendance Logging.
 * Saves an entire class roster to the local sync queue in one operation.
 */
export async function submitBulkAttendance(records: AttendanceBulkRecord[]) {
    // 1. Enqueue bulk array for background sync
    // The SyncEngine handles order and upsert logic
    await syncEngine.enqueueAction('ATTENDANCE', records);

    // 2. Broadcast success for UI animation
    window.dispatchEvent(new CustomEvent('attendance-success'));
    
    return { success: true };
}

/**
 * Pre-loads the student roster for a class into local cache.
 */
export async function prefetchClassRoster(classId: string, schoolId: string) {
    try {
        const data = await api.getStudents({ classId, schoolId });
        if (data) {
            await offlineDB.roster_cache.put({
                key: `roster_${classId}`,
                data,
                updated_at: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error('Error prefetching roster:', err);
    }
}

export async function getCachedRoster(classId: string) {
    const cached = await offlineDB.roster_cache.get(`roster_${classId}`);
    return cached?.data || [];
}


