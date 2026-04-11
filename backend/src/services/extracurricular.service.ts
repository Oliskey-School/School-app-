import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ExtracurricularService {
    static async getActivities(schoolId: string, branchId?: string) {
        return await prisma.extracurricularActivity.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                _count: {
                    select: { participants: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    static async getMyActivities(studentId: string) {
        const signups = await prisma.studentActivity.findMany({
            where: { student_id: studentId },
            include: { activity: true }
        });
        return signups.map(s => s.activity);
    }

    static async joinActivity(studentId: string, activityId: string) {
        const result = await prisma.studentActivity.upsert({
            where: {
                student_id_activity_id: {
                    student_id: studentId,
                    activity_id: activityId
                }
            },
            create: {
                student_id: studentId,
                activity_id: activityId
            },
            update: {}
        });

        const activity = await prisma.extracurricularActivity.findUnique({ where: { id: activityId } });
        if (activity) {
            SocketService.emitToSchool(activity.school_id, 'academic:updated', { action: 'join_activity', activityId, studentId });
        }
        return result;
    }

    static async leaveActivity(studentId: string, activityId: string) {
        const result = await prisma.studentActivity.delete({
            where: {
                student_id_activity_id: {
                    student_id: studentId,
                    activity_id: activityId
                }
            }
        });

        const activity = await prisma.extracurricularActivity.findUnique({ where: { id: activityId } });
        if (activity) {
            SocketService.emitToSchool(activity.school_id, 'academic:updated', { action: 'leave_activity', activityId, studentId });
        }
        return result;
    }

    static async getEvents(schoolId: string, branchId?: string, startDate?: Date, endDate?: Date) {
        return await prisma.extracurricularEvent.findMany({
            where: {
                activity: {
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : undefined
                },
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: { activity: true },
            orderBy: { date: 'asc' }
        });
    }
}
