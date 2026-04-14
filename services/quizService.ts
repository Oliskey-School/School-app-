import { api } from '../lib/api';
import { CBTTest } from '../types';

/**
 * Quiz (CBT) Service
 * Handles all quiz-related operations via the backend API.
 */

export async function fetchCBTExams(schoolId?: string, classId?: string): Promise<CBTTest[]> {
    try {
        const data = await api.getQuizzes(schoolId, classId);
        return data || [];
    } catch (err) {
        console.error('Error fetching CBT exams:', err);
        return [];
    }
}

export async function fetchQuizSubmission(quizId: string | number, studentId: string): Promise<any> {
    try {
        return await api.getQuizSubmission(quizId, studentId);
    } catch (err) {
        console.error('Error fetching quiz submission:', err);
        return null;
    }
}

export async function submitQuizResult(submissionData: any): Promise<boolean> {
    try {
        await api.submitQuizResult(submissionData);
        return true;
    } catch (err) {
        console.error('Error submitting quiz result:', err);
        return false;
    }
}

export async function syncCBTToGradebook(studentId: string, quizId: string, score: number, schoolId: string): Promise<boolean> {
    try {
        // Find quiz details to get the subject
        const quizzes = await api.getQuizzes(schoolId);
        const quiz = quizzes.find((q: any) => q.id === quizId);
        
        if (!quiz) {
            console.error('Quiz not found for sync');
            return false;
        }

        // Call academic endpoint to save grade
        await api.saveGrade({
            studentId,
            subject: quiz.subject,
            term: quiz.term || 'First Term',
            score,
            session: quiz.session || '2024/2025'
        });

        return true;
    } catch (err) {
        console.error('Error syncing CBT to gradebook:', err);
        return false;
    }
}
