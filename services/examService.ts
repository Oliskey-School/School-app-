import { api } from '../lib/api';
import { Exam } from '../types';

/**
 * Exam Service
 * Handles all exam-related operations via the backend API.
 * All direct Supabase calls have been removed.
 */

export async function fetchExams(schoolId?: string, branchId?: string, teacherId?: string): Promise<Exam[]> {
    try {
        const data = await api.getExams(schoolId || '', branchId, teacherId);

        return (data || []).map((e: any) => ({
            id: e.id,
            type: e.type,
            date: e.date,
            time: e.time,
            className: e.class_name || e.className,
            subject: e.subject,
            isPublished: e.is_published || false,
            teacherId: e.teacher_id
        }));
    } catch (err) {
        console.error('Error fetching exams:', err);
        return [];
    }
}

export async function createExam(schoolId: string, branchId: string | undefined, examData: Omit<Exam, 'id' | 'isPublished' | 'teacherId'>): Promise<Exam | null> {
    try {
        const result = await api.createExam(schoolId, branchId, {
            type: examData.type,
            date: examData.date,
            time: (examData as any).time,
            class_name: examData.className,
            subject: examData.subject,
            is_published: false,
        });
        return result ? {
            id: result.id,
            type: result.type,
            date: result.date,
            time: result.time,
            className: result.class_name || result.className,
            subject: result.subject,
            isPublished: result.is_published || false,
            teacherId: result.teacher_id
        } : null;
    } catch (err) {
        console.error('Error creating exam:', err);
        return null;
    }
}

export async function updateExam(id: string, schoolId: string, branchId: string | undefined, updates: Partial<Exam>): Promise<boolean> {
    try {
        const payload: any = {};
        if (updates.type) payload.type = updates.type;
        if (updates.date) payload.date = updates.date;
        if ((updates as any).time) payload.time = (updates as any).time;
        if (updates.className) payload.class_name = updates.className;
        if (updates.subject) payload.subject = updates.subject;
        if (updates.isPublished !== undefined) payload.is_published = updates.isPublished;

        await api.updateExam(id, schoolId, branchId, payload);
        return true;
    } catch (err) {
        console.error('Error updating exam:', err);
        return false;
    }
}

export async function deleteExam(id: string, schoolId: string, branchId: string | null): Promise<boolean> {
    try {
        await api.deleteExam(id, schoolId, branchId);
        return true;
    } catch (err) {
        console.error('Error deleting exam:', err);
        return false;
    }
}

export async function publishExam(id: string, schoolId: string, branchId: string | undefined): Promise<boolean> {
    return updateExam(id, schoolId, branchId, { isPublished: true } as any);
}

// (fetchQuizSubmission and submitQuizResult moved to quizService.ts)
