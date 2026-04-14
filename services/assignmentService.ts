import { api } from '../lib/api';
import { Assignment } from '../types';

/**
 * Assignment Service
 * Handles all assignment-related operations via the backend API.
 */

export async function fetchAssignments(schoolId: string, branchId?: string, classId?: string): Promise<Assignment[]> {
    try {
        const data = await api.getAssignments(schoolId, { branchId, classId });
        return data || [];
    } catch (err) {
        console.error('Error fetching assignments:', err);
        return [];
    }
}

export async function createAssignment(assignmentData: any): Promise<Assignment | null> {
    try {
        return await api.createAssignment(assignmentData);
    } catch (err) {
        console.error('Error creating assignment:', err);
        return null;
    }
}

export async function submitAssignment(assignmentId: string, studentId: string, submissionData: any): Promise<boolean> {
    try {
        await api.submitAssignment(assignmentId, studentId, submissionData);
        return true;
    } catch (err) {
        console.error('Error submitting assignment:', err);
        return false;
    }
}

export async function fetchSubmissions(assignmentId: string): Promise<any[]> {
    try {
        return await api.getSubmissions(assignmentId);
    } catch (err) {
        console.error('Error fetching submissions:', err);
        return [];
    }
}
