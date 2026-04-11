import prisma from '../config/database';

export class ReportCardService {
    static async getReportCards(schoolId: string, branchId: string | undefined, teacherId?: string) {
        const where: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        if (teacherId) {
            where.Student = {
                StudentEnrollment: {
                    some: {
                        Class: {
                            ClassTeacher: {
                                some: { teacher_id: teacherId }
                            }
                        }
                    }
                }
            };
        }

        const reports = await prisma.reportCard.findMany({
            where,
            include: {
                Student: true
            },
            orderBy: [
                { session: 'desc' },
                { term: 'desc' }
            ]
        });

        return reports.map(r => ({
            ...r,
            status: r.is_published ? 'Published' : 'Submitted'
        }));
    }

    static async updateStatus(schoolId: string, branchId: string | undefined, id: string, status: string) {
        const isPublished = status === 'Published';
        const updateData: any = { is_published: isPublished };

        const where: any = {
            id,
            school_id: schoolId
        };

        // Note: Prisma's 'update' only allows unique identifiers in 'where'. 
        // We use 'updateMany' to filter by multiple fields safely.
        await prisma.reportCard.updateMany({
            where,
            data: updateData
        });

        const updated = await prisma.reportCard.findUnique({
            where: { id }
        });

        return {
            ...updated,
            status: updated?.is_published ? 'Published' : 'Submitted'
        };
    }
}
