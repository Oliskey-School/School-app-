import { syncEngine } from './syncEngine';
import { calculateGrade, CurriculumType } from './grading-utils';
import { api } from './api';

export interface GradeEntry {
    student_id: string;
    subject: string;
    term: string;
    session: string;
    ca_score: number;
    exam_score: number;
    total_score: number;
    grade: string;
    teacher_remark?: string;
    school_id: string;
}

/**
 * Saves a student's grade resiliently.
 * Calculates the grade automatically before enqueuing for sync.
 */
export async function saveGradeResilient(
    data: Omit<GradeEntry, 'total_score' | 'grade'>, 
    curriculum: CurriculumType
) {
    const total_score = data.ca_score + data.exam_score;
    const gradeInfo = calculateGrade(total_score, curriculum);

    const payload: GradeEntry = {
        ...data,
        total_score,
        grade: gradeInfo.grade,
        teacher_remark: data.teacher_remark || gradeInfo.description
    };

    // Enqueue for background sync (Offline-first mandate)
    await syncEngine.enqueueAction('GRADE_ENTRY', payload);
    
    return payload;
}

/**
 * Fetches class performance summary. 
 */
export async function getClassGrades(classId: string, subject: string, term: string) {
    const { data, error } = await api
        .from('academic_performance')
        .select(`
            *,
            students (name, avatar_url)
        `)
        .eq('subject', subject)
        .eq('term', term)
        .order('total_score', { ascending: false });

    if (error) throw error;
    return data;
}

