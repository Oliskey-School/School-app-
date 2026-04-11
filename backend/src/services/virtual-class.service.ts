import prisma from '../config/database';

export class VirtualClassService {
    static async createSession(sessionData: any) {
        return prisma.virtualClassSession.create({
            data: sessionData
        });
    }

    static async getSessions(schoolId: string, branchId: string | undefined, teacherId?: string) {
        const where: any = { school_id: schoolId };

        if (teacherId) {
            where.teacher_id = teacherId;
        }

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        return prisma.virtualClassSession.findMany({
            where,
            include: {
                teacher: {
                    select: {
                        full_name: true,
                        id: true
                    }
                }
            },
            orderBy: { start_time: 'desc' }
        });
    }

    static async recordAttendance(sessionId: string, studentId: string) {
        return prisma.virtualClassAttendance.upsert({
            where: {
                session_id_student_id: {
                    session_id: sessionId,
                    student_id: studentId
                }
            },
            update: {
                joined_at: new Date()
            },
            create: {
                session_id: sessionId,
                student_id: studentId,
                joined_at: new Date()
            }
        });
    }
}
