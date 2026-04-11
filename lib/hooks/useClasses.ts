import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { ClassInfo } from '../../types';

export interface UseClassesResult {
    classes: ClassInfo[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createClass: (classInfo: Partial<ClassInfo>) => Promise<ClassInfo | null>;
    updateClass: (id: string, updates: Partial<ClassInfo>) => Promise<ClassInfo | null>;
    deleteClass: (id: string) => Promise<boolean>;
}

export function useClasses(schoolId?: string): UseClassesResult {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchClasses = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getClasses(schoolId);

            const transformedClasses: ClassInfo[] = (data || []).map(transformClassInfo);

            setClasses(transformedClasses);
            setError(null);
        } catch (err) {
            console.error('Error fetching classes:', err);
            setError(err as Error);
            setClasses([]);
        } finally {
            setLoading(false);
        }
    }, [schoolId]);

    useEffect(() => {
        fetchClasses();

        // Realtime is handled via polling in the new architecture if needed.
    }, [fetchClasses]);

    const createClass = async (classData: Partial<ClassInfo>): Promise<ClassInfo | null> => {
        try {
            const data = await api.createClass({
                id: classData.id,
                subject: classData.subject,
                grade: classData.grade,
                section: classData.section,
                department: classData.department,
            });

            return transformClassInfo(data);
        } catch (err) {
            console.error('Error creating class:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateClass = async (id: string, updates: Partial<ClassInfo>): Promise<ClassInfo | null> => {
        try {
            const data = await api.updateClass(id, {
                subject: updates.subject,
                grade: updates.grade,
                section: updates.section,
                department: updates.department,
            });

            return transformClassInfo(data);
        } catch (err) {
            console.error('Error updating class:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteClass = async (id: string): Promise<boolean> => {
        try {
            await api.deleteClass(id);
            return true;
        } catch (err) {
            console.error('Error deleting class:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        classes,
        loading,
        error,
        refetch: fetchClasses,
        createClass,
        updateClass,
        deleteClass,
    };
}

const transformClassInfo = (c: any): ClassInfo => ({
    id: c.id,
    subject: c.subject,
    grade: c.grade,
    section: c.section,
    department: c.department,
    studentCount: 0,
});
