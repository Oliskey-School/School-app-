import prisma from '../config/database';
import { SocketService } from './socket.service';

export class SubjectService {
    static async getSubjects(schoolId: string, branchId?: string) {
        const where: any = { school_id: schoolId };
        // Branch isolation: only this branch's subjects (plus any school-wide ones).
        if (branchId && branchId !== 'all') {
            where.OR = [{ branch_id: branchId }, { branch_id: null }];
        }
        return await prisma.subject.findMany({
            where,
            orderBy: { name: 'asc' }
        });
    }

    static async createSubject(schoolId: string, branchId: string | undefined, name: string) {
        const subject = await prisma.subject.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                name: name
            }
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'create_subject', subjectId: subject.id });
        return subject;
    }

    static async getCurriculumTopics(subjectId: string, term?: string) {
        return await prisma.curriculumTopic.findMany({
            where: {
                subject_id: subjectId,
                term: term
            },
            orderBy: { week_number: 'asc' }
        });
    }
}
