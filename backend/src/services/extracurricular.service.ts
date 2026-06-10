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

    static async joinActivity(schoolId: string, studentId: string, activityId: string) {
        // Verify the activity is in the caller's school before allowing join.
        const activity = await prisma.extracurricularActivity.findFirst({
            where: { id: activityId, school_id: schoolId }
        });
        if (!activity) {
            const err: any = new Error('Activity not found');
            err.statusCode = 404;
            throw err;
        }

        const result = await prisma.studentActivity.upsert({
            where: {
                student_id_activity_id: {
                    student_id: studentId,
                    activity_id: activityId
                }
            },
            create: {
                student_id: studentId,
                activity_id: activityId,
                school_id: activity.school_id,
                branch_id: activity.branch_id
            },
            update: {}
        });

        SocketService.emitToSchool(activity.school_id, 'academic:updated', { action: 'join_activity', activityId, studentId });
        return result;
    }

    static async leaveActivity(schoolId: string, studentId: string, activityId: string) {
        // Verify the activity is in the caller's school before allowing leave.
        const activity = await prisma.extracurricularActivity.findFirst({
            where: { id: activityId, school_id: schoolId }
        });
        if (!activity) {
            const err: any = new Error('Activity not found');
            err.statusCode = 404;
            throw err;
        }

        const result = await prisma.studentActivity.delete({
            where: {
                student_id_activity_id: {
                    student_id: studentId,
                    activity_id: activityId
                }
            }
        });

        SocketService.emitToSchool(activity.school_id, 'academic:updated', { action: 'leave_activity', activityId, studentId });
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
