import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ExternalExamService {
    static async getExamBodies(schoolId: string) {
        return await prisma.examBody.findMany({
            where: { school_id: schoolId },
            orderBy: { name: 'asc' }
        });
    }

    static async createExamBody(schoolId: string, payload: any) {
        const body = await prisma.examBody.create({
            data: {
                ...payload,
                school_id: schoolId
            }
        });

        SocketService.emitToSchool(schoolId, 'exam:updated', { action: 'create_body', bodyId: body.id });
        return body;
    }

    static async getExamRegistrations(bodyId: string, schoolId: string) {
        return await prisma.examRegistration.findMany({
            where: {
                exam_body_id: bodyId,
                school_id: schoolId
            }
        });
    }

    static async createExamRegistrations(schoolId: string, registrations: any[]) {
        const data = registrations.map(r => ({
            ...r,
            school_id: schoolId,
            status: r.status || 'registered'
        }));

        const result = await prisma.examRegistration.createMany({
            data
        });

        SocketService.emitToSchool(schoolId, 'exam:updated', { action: 'create_registrations' });
        return result;
    }
}
