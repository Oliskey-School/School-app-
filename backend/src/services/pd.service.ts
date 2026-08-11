import prisma from '../config/database';

export class PDService {
    /** Resolve the Teacher.id for a logged-in user. PDEnrollment.teacher_id is a
     * FK to Teacher.id, not User.id — callers must not pass req.user.id directly. */
    static async resolveTeacherId(userId: string): Promise<string | null> {
        const teacher = await prisma.teacher.findFirst({ where: { user_id: userId }, select: { id: true } });
        return teacher?.id || null;
    }

    static async getCourses(schoolId: string, teacherId?: string | null) {
        const courses = await prisma.pDCourse.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
        if (!teacherId) return courses.map(c => ({ ...c, is_enrolled: false }));
        const enrollments = await prisma.pDEnrollment.findMany({
            where: { teacher_id: teacherId },
            select: { course_id: true }
        });
        const enrolledIds = new Set(enrollments.map(e => e.course_id));
        return courses.map(c => ({ ...c, is_enrolled: enrolledIds.has(c.id) }));
    }

    static async getMyEnrollments(teacherId: string) {
        return await prisma.pDEnrollment.findMany({
            where: { teacher_id: teacherId },
            include: { course: true },
            orderBy: { enrolled_at: 'desc' }
        });
    }

    static async enrollInCourse(teacherId: string, courseId: string, schoolId: string) {
        const existing = await prisma.pDEnrollment.findFirst({ where: { teacher_id: teacherId, course_id: courseId } });
        if (existing) return existing;
        return await prisma.pDEnrollment.create({
            data: {
                teacher_id: teacherId,
                course_id: courseId,
                school_id: schoolId,
                status: 'In Progress',
                progress_percentage: 0
            }
        });
    }

    static async enrollmentBelongsToTeacher(enrollmentId: string, teacherId: string): Promise<boolean> {
        const enrollment = await prisma.pDEnrollment.findFirst({
            where: { id: enrollmentId, teacher_id: teacherId },
            select: { id: true }
        });
        return !!enrollment;
    }

    static async updateProgress(enrollmentId: string, progress: number) {
        const data: any = { progress_percentage: progress };
        if (progress >= 100) {
            data.status = 'Completed';
            data.completed_at = new Date();
        }
        return await prisma.pDEnrollment.update({
            where: { id: enrollmentId },
            data
        });
    }
}
