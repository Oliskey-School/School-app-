import prisma from '../config/database';
import { SocketService } from './socket.service';

export class SubjectService {
    static async getSubjects(schoolId: string, branchId?: string) {
        return await prisma.subject.findMany({
            where: {
                school_id: schoolId
            },
            orderBy: { name: 'asc' }
        });
    }

    static async createSubject(schoolId: string, name: string) {
        const subject = await prisma.subject.create({
            data: {
                school_id: schoolId,
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
