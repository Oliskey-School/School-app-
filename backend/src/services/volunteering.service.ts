import prisma from '../config/database';
import { SocketService } from './socket.service';

export class VolunteeringService {
    static async getOpportunities(schoolId: string) {
        return prisma.volunteeringOpportunity.findMany({
            where: { school_id: schoolId },
            orderBy: { date: 'asc' }
        });
    }

    static async createOpportunity(schoolId: string, data: any) {
        const { date, time, ...rest } = data;
        const opportunity = await prisma.volunteeringOpportunity.create({
            data: {
                ...rest,
                date: date ? new Date(date) : null,
                time: time,
                school_id: schoolId
            }
        });

        SocketService.emitToSchool(schoolId, 'volunteering:updated', { action: 'create_opportunity', opportunityId: opportunity.id });
        return opportunity;
    }

    static async deleteOpportunity(schoolId: string, id: string) {
        const result = await prisma.volunteeringOpportunity.deleteMany({
            where: { id, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'volunteering:updated', { action: 'delete_opportunity', opportunityId: id });
        return result;
    }

    static async getSignups(schoolId: string, opportunityId: string) {
        return prisma.volunteerSignup.findMany({
            where: { opportunity_id: opportunityId, school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async signup(schoolId: string, data: any) {
        const result = await prisma.volunteerSignup.create({
            data: {
                ...data,
                school_id: schoolId
            }
        });

        SocketService.emitToSchool(schoolId, 'volunteering:updated', { action: 'signup', signupId: result.id, opportunityId: data.opportunity_id });
        return result;
    }
}
