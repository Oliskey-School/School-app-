import { api } from '../lib/api';

/**
 * Attendance Service
 * Handles all attendance-related operations via the backend API.
 */

export async function checkBackendConnection(): Promise<boolean> {
    try {
        const health = await api.checkBackendHealth();
        return health.backend;
    } catch (err) {
        console.error('Backend connection check failed:', err);
        return false;
    }
}

// ============================================
// ATTENDANCE OPERATIONS
// ============================================

export async function saveAttendanceRecords(records: Array<{
    studentId: string | number;
    date: string;
    status: string;
    className?: string;
}>): Promise<boolean> {
    try {
        const result = await api.saveAttendance(records);
        return !!result;
    } catch (err) {
        console.error('Error saving attendance records:', err);
        return false;
    }
}

export async function fetchAttendanceForClass(classId: string, date: string): Promise<any[]> {
    try {
        const data = await api.getAttendance(classId, date);
        return data || [];
    } catch (err) {
        console.error('Error fetching attendance:', err);
        return [];
    }
}
