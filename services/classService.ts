import { api } from '../lib/api';

/**
 * Class Service
 * Handles all class and subject related operations via the backend API.
 */

export async function fetchClasses(schoolId: string, branchId?: string): Promise<any[]> {
    if (!schoolId) return [];

    try {
        const classes = await api.getClasses(schoolId, branchId);
        return (classes || []).map(c => ({
            ...c,
            studentCount: c.student_count || c.studentCount || 0
        }));
    } catch (error) {
        console.error('Error fetching classes:', error);
        return [];
    }
}

export async function fetchSubjects(schoolId?: string, branchId?: string, curriculumId?: string | number): Promise<any[]> {
    try {
        const data = await api.getSubjects(schoolId, branchId, curriculumId);
        return data || [];
    } catch (err) {
        console.error('Error fetching subjects:', err);
        return [];
    }
}

export async function fetchClassSubjects(grade: number, section: string): Promise<any[]> {
    try {
        return await (api as any).getClassSubjects(grade, section);
    } catch (err) {
        console.error('Error fetching class subjects:', err);
        return [];
    }
}

export async function createClass(classData: any): Promise<any> {
    try {
        return await api.createClass(classData);
    } catch (err) {
        console.error('Error creating class:', err);
        return null;
    }
}

export async function fetchCurricula(schoolId?: string): Promise<any[]> {
    try {
        // Fetch from API
        if (schoolId) {
            const data = await api.getCurricula(schoolId);
            if (data && data.length > 0) return data;
        }
        
        // Placeholder as fallback ONLY if no data from API
        return !schoolId ? [
            { id: '1', name: 'National Curriculum', type: 'General' },
            { id: '2', name: 'British Curriculum', type: 'International' },
            { id: '3', name: 'American Curriculum', type: 'International' }
        ] : [];
    } catch (err) {
        console.error('Error fetching curricula:', err);
        return [];
    }
}
