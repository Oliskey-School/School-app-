import prisma from '../config/database';

export class VirtualClassService {
    static async createSession(sessionData: any) {
        // The controller uses `class_id` for a teacher access check, but it is NOT a
        // column on VirtualClassSession. Passing it (or any other stray field the
        // frontend sends) makes prisma.create() fail with "Unknown argument". So we
        // build the row from the model's known fields only.
        const {
            school_id, branch_id, teacher_id, title, subject, topic, description,
            meeting_url, platform, start_time, end_time, status, meeting_id, password, recording_url,
        } = sessionData || {};

        return prisma.virtualClassSession.create({
            data: {
                school_id,
                branch_id: branch_id ?? null,
                teacher_id: teacher_id ?? null,
                title,
                subject: subject ?? null,
                topic: topic ?? null,
                description: description ?? null,
                meeting_url: meeting_url ?? null,
                ...(platform ? { platform } : {}),
                start_time,
                end_time: end_time ?? null,
                ...(status ? { status } : {}),
                meeting_id: meeting_id ?? null,
                password: password ?? null,
                recording_url: recording_url ?? null,
            },
        });
    }

    static async getSessions(schoolId: string, branchId: string | undefined, teacherId?: string) {
        const where: any = { school_id: schoolId };

        if (teacherId) {
            where.teacher_id = teacherId;
        }

        // Include school-wide sessions (branch_id null) so a class a teacher starts
        // without a branch still appears for students whose branch is set. Matching
        // only the exact branch made live classes show "No sessions found".
        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
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
        } as any);
    }
}
