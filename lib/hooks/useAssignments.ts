import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Assignment } from '../../types';

export interface UseAssignmentsResult {
    assignments: Assignment[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createAssignment: (assignment: Partial<Assignment>) => Promise<Assignment | null>;
    updateAssignment: (id: number, updates: Partial<Assignment>) => Promise<Assignment | null>;
    deleteAssignment: (id: number) => Promise<boolean>;
}

export function useAssignments(filters?: { className?: string; subject?: string; teacherId?: string }): UseAssignmentsResult {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            const schoolId = sessionStorage.getItem('school_id') || undefined;
            const data = await api.getAssignments(schoolId, filters);

            const transformedAssignments: Assignment[] = (data || []).map(transformAssignment);

            setAssignments(transformedAssignments);
            setError(null);
        } catch (err) {
            console.error('Error fetching assignments:', err);
            setError(err as Error);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    const createAssignment = async (assignmentData: Partial<Assignment>): Promise<Assignment | null> => {
        try {
            const data = await api.createAssignment({
                title: assignmentData.title,
                description: assignmentData.description,
                class_name: assignmentData.className,
                subject: assignmentData.subject,
                due_date: assignmentData.dueDate,
                total_students: assignmentData.totalStudents,
                submissions_count: assignmentData.submissionsCount,
                teacher_id: assignmentData.teacherId,
                class_id: assignmentData.classId
            });

            return transformAssignment(data);
        } catch (err) {
            console.error('Error creating assignment:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateAssignment = async (id: number, updates: Partial<Assignment>): Promise<Assignment | null> => {
        try {
            const data = await api.updateAssignment(String(id), {
                title: updates.title,
                description: updates.description,
                class_name: updates.className,
                subject: updates.subject,
                due_date: updates.dueDate,
                total_students: updates.totalStudents,
                submissions_count: updates.submissionsCount,
                teacher_id: updates.teacherId,
                class_id: updates.classId
            });

            return transformAssignment(data);
        } catch (err) {
            console.error('Error updating assignment:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteAssignment = async (id: number): Promise<boolean> => {
        try {
            await api.deleteAssignment(String(id));
            return true;
        } catch (err) {
            console.error('Error deleting assignment:', err);
            setError(err as Error);
            return false;
        }
    };

    const transformAssignment = (a: any): Assignment => ({
        id: a.id,
        title: a.title,
        description: a.description,
        className: a.class_name,
        classId: a.class_id,
        subject: a.subject,
        dueDate: a.due_date,
        totalStudents: a.total_students,
        submissionsCount: a.submissions_count,
        teacherId: a.teacher_id
    });

    return {
        assignments,
        loading,
        error,
        refetch: fetchAssignments,
        createAssignment,
        updateAssignment,
        deleteAssignment,
    };
}
