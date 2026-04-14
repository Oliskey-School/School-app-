import { api } from '../lib/api';
import { Teacher } from '../types';

/**
 * Teacher Service
 * Handles all teacher-related operations via the backend API.
 */

export async function fetchTeachers(schoolId?: string, branchId?: string): Promise<Teacher[]> {
    try {
        const data = await api.getTeachers(schoolId, branchId);
        return data || [];
    } catch (err) {
        console.error('Error fetching teachers:', err);
        return [];
    }
}

export async function fetchTeacherById(id: string): Promise<Teacher | null> {
    try {
        return await api.getTeacherById(id);
    } catch (err) {
        console.error('Error fetching teacher:', err);
        return null;
    }
}

export async function createTeacher(teacherData: any): Promise<Teacher | null> {
    try {
        return await api.createTeacher(teacherData);
    } catch (err) {
        console.error('Error creating teacher:', err);
        return null;
    }
}

export async function updateTeacher(id: string, updates: any): Promise<boolean> {
    try {
        await api.updateTeacher(id, updates);
        return true;
    } catch (err) {
        console.error('Error updating teacher:', err);
        return false;
    }
}

export async function deleteTeacher(id: string): Promise<boolean> {
    try {
        await api.deleteTeacher(id);
        return true;
    } catch (err) {
        console.error('Error deleting teacher:', err);
        return false;
    }
}

export async function fetchMyTeacherProfile(): Promise<Teacher | null> {
    try {
        return await api.getMyTeacherProfile();
    } catch (err) {
        console.error('Error fetching my teacher profile:', err);
        return null;
    }
}

export async function submitTeacherAttendance(records: any[]): Promise<boolean> {
    try {
        await api.submitTeacherAttendance(records);
        return true;
    } catch (err) {
        console.error('Error submitting teacher attendance:', err);
        return false;
    }
}

// ============================================
// LESSON NOTES
// ============================================

export async function fetchLessonNotes(schoolId: string, teacherId?: string): Promise<any[]> {
    try {
        return await api.getLessonNotes(schoolId, teacherId);
    } catch (err) {
        console.error('Error fetching lesson notes:', err);
        return [];
    }
}

export async function createLessonNote(noteData: any): Promise<any | null> {
    try {
        return await api.createLessonNote(noteData);
    } catch (err) {
        console.error('Error creating lesson note:', err);
        return null;
    }
}

