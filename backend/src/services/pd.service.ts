import prisma from '../config/database';

export class PDService {
    static async getCourses(schoolId: string) {
        return await prisma.pDCourse.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async getMyEnrollments(teacherId: string) {
        return await prisma.pDEnrollment.findMany({
            where: { teacher_id: teacherId },
            include: { course: true },
            orderBy: { enrolled_at: 'desc' }
        });
    }

    static async enrollInCourse(teacherId: string, courseId: string) {
        return await prisma.pDEnrollment.create({
            data: {
                teacher_id: teacherId,
                course_id: courseId,
                status: 'In Progress',
                progress_percentage: 0
            }
        });
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
