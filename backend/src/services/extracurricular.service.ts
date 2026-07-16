import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ExtracurricularService {
    static async createActivity(schoolId: string, branchId: string | undefined, data: any) {
        if (!data.name?.trim()) throw new Error('A club name is required');
        if (!data.category?.trim()) throw new Error('A category is required');
        return prisma.extracurricularActivity.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                name: data.name.trim(), description: data.description?.trim() || null,
                category: data.category.trim(), icon: data.icon || null,
                advisor_teacher_id: data.advisor_teacher_id || null,
            },
        });
    }

    static async markAttendance(schoolId: string, activityId: string, date: string, records: { student_id: string; status: string }[], markedBy: string) {
        const activity = await prisma.extracurricularActivity.findFirst({ where: { id: activityId, school_id: schoolId, deleted_at: null } });
        if (!activity) throw new Error('Activity not found');
        if (!Array.isArray(records) || records.length === 0) throw new Error('At least one attendance record is required');

        const results = [];
        for (const r of records) {
            const row = await (prisma as any).clubAttendance.upsert({
                where: { activity_id_student_id_date: { activity_id: activityId, student_id: r.student_id, date: new Date(date) } },
                update: { status: r.status, marked_by: markedBy },
                create: {
                    school_id: schoolId, branch_id: activity.branch_id, activity_id: activityId,
                    student_id: r.student_id, date: new Date(date), status: r.status, marked_by: markedBy,
                },
            });
            results.push(row);
        }
        SocketService.emitToSchool(schoolId, 'club:updated', { action: 'attendance', activityId, date });
        return results;
    }

    static async getAttendance(schoolId: string, activityId: string, date: string) {
        return (prisma as any).clubAttendance.findMany({ where: { school_id: schoolId, activity_id: activityId, date: new Date(date) } });
    }

    static async addAchievement(schoolId: string, branchId: string | undefined, activityId: string, data: any) {
        const activity = await prisma.extracurricularActivity.findFirst({ where: { id: activityId, school_id: schoolId, deleted_at: null } });
        if (!activity) throw new Error('Activity not found');
        if (!data.student_id) throw new Error('A student is required');
        if (!data.title?.trim()) throw new Error('A title is required');
        return prisma.achievement.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                student_id: data.student_id, activity_id: activityId,
                title: data.title.trim(), description: data.description?.trim() || null,
                type: data.type || 'competition', date: data.date ? new Date(data.date) : new Date(),
            },
        });
    }

    static async getClubAchievements(schoolId: string, activityId: string) {
        return prisma.achievement.findMany({
            where: { school_id: schoolId, activity_id: activityId, deleted_at: null },
            include: { student: { select: { id: true, full_name: true } } },
            orderBy: { date: 'desc' },
        });
    }

    static async setAdvisor(schoolId: string, activityId: string, teacherId: string | null) {
        const activity = await prisma.extracurricularActivity.findFirst({ where: { id: activityId, school_id: schoolId, deleted_at: null } });
        if (!activity) throw new Error('Activity not found');
        return prisma.extracurricularActivity.update({ where: { id: activityId }, data: { advisor_teacher_id: teacherId } });
    }

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
