import prisma from '../config/database';
import { NotificationService } from './notification.service';

export const DEFAULT_CRITERIA = [
    { key: 'lesson_prep', label: 'Lesson Preparation', max_score: 10 },
    { key: 'teaching_method', label: 'Teaching Method', max_score: 10 },
    { key: 'student_participation', label: 'Student Participation', max_score: 10 },
    { key: 'classroom_management', label: 'Classroom Management', max_score: 10 },
    { key: 'time_management', label: 'Time Management', max_score: 10 },
];

function gradeFor(percent: number): string {
    if (percent >= 90) return 'A';
    if (percent >= 75) return 'B';
    if (percent >= 60) return 'C';
    if (percent >= 50) return 'D';
    return 'F';
}

export class ObservationService {
    static async getOrCreateDefaultTemplate(schoolId: string) {
        let template = await (prisma as any).observationTemplate.findFirst({ where: { school_id: schoolId, is_active: true }, orderBy: { version: 'desc' } });
        if (!template) {
            template = await (prisma as any).observationTemplate.create({
                data: { school_id: schoolId, name: 'Classroom Observation', criteria: DEFAULT_CRITERIA as any, version: 1, is_active: true },
            });
        }
        return template;
    }

    static async createObservation(schoolId: string, branchId: string | undefined, data: any, observerId: string) {
        if (!data.teacher_id) throw new Error('A teacher is required');
        if (!data.date) throw new Error('A date is required');
        if (!Array.isArray(data.scores) || data.scores.length === 0) throw new Error('At least one criterion score is required');

        const teacher = await prisma.teacher.findFirst({ where: { id: data.teacher_id, school_id: schoolId, deleted_at: null } });
        if (!teacher) throw new Error('Teacher not found');

        const template = await this.getOrCreateDefaultTemplate(schoolId);
        const criteria: any[] = template.criteria as any;

        let totalScore = 0, totalMax = 0;
        const responseRows: { criterion_key: string; score: number; comment?: string }[] = [];
        for (const entry of data.scores) {
            const criterion = criteria.find(c => c.key === entry.criterion_key);
            if (!criterion) throw new Error(`Unknown criterion: ${entry.criterion_key}`);
            const score = Number(entry.score);
            if (Number.isNaN(score) || score < 0 || score > criterion.max_score) {
                throw new Error(`Score for ${criterion.label} must be between 0 and ${criterion.max_score}`);
            }
            totalScore += score;
            totalMax += criterion.max_score;
            responseRows.push({ criterion_key: entry.criterion_key, score, comment: entry.comment?.trim() || undefined });
        }

        const percent = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

        const observation = await (prisma as any).classroomObservation.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : (teacher.branch_id ?? null),
                template_id: template.id, teacher_id: teacher.id, class_id: data.class_id || null,
                observer_id: observerId, date: new Date(data.date), status: 'Submitted',
                overall_score: Math.round(percent * 10) / 10, overall_grade: gradeFor(percent),
                notes: data.notes?.trim() || null,
                responses: { create: responseRows },
            },
            include: { responses: true },
        });

        if (teacher.user_id) {
            await NotificationService.createNotification(schoolId, branchId, {
                user_id: teacher.user_id, title: 'Classroom Observation Feedback',
                message: `A classroom observation was conducted on ${new Date(data.date).toISOString().slice(0, 10)}. Overall score: ${observation.overall_score}% (${observation.overall_grade}).`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Observation] notify teacher failed:', err.message));
        }

        return { ...observation, criteria };
    }

    static async getObservationsForTeacher(schoolId: string, teacherId: string) {
        const rows = await (prisma as any).classroomObservation.findMany({
            where: { school_id: schoolId, teacher_id: teacherId, deleted_at: null },
            include: { responses: true },
            orderBy: { date: 'desc' },
        });
        const templateIds = Array.from(new Set(rows.map((r: any) => r.template_id)));
        const templates = await (prisma as any).observationTemplate.findMany({ where: { id: { in: templateIds } } });
        const templateMap = new Map(templates.map((t: any) => [t.id, t.criteria]));
        return rows.map((r: any) => ({ ...r, criteria: templateMap.get(r.template_id) || DEFAULT_CRITERIA }));
    }

    static async getObservation(schoolId: string, id: string) {
        const observation = await (prisma as any).classroomObservation.findFirst({
            where: { id, school_id: schoolId, deleted_at: null },
            include: { responses: true },
        });
        if (!observation) throw new Error('Observation not found');
        const template = await (prisma as any).observationTemplate.findUnique({ where: { id: observation.template_id } });
        return { ...observation, criteria: template?.criteria || DEFAULT_CRITERIA };
    }
}
