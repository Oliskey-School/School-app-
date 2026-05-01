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
            where.student = {
                enrollments: {
                    some: {
                        class: {
                            teachers: {
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
                student: true
            },
            orderBy: [
                { session: 'desc' },
                { term: 'desc' }
            ]
        });

        return reports.map(r => {
            const academicData = r.academic_records as any || {};
            const grades = academicData.grades || (Array.isArray(academicData) ? academicData : []);
            
            return {
                ...r,
                status: r.status || (r.is_published ? 'Published' : 'Submitted'),
                academic_records: grades // Flatten for easy frontend consumption
            };
        });
    }

    static async getReportCard(id: string, schoolId: string, branchId: string | undefined) {
        const report = await prisma.reportCard.findUnique({
            where: { id },
            include: {
                student: true
            }
        });

        if (!report || report.school_id !== schoolId) {
            return null;
        }

        // Branch check
        if (branchId && branchId !== 'all' && report.branch_id && report.branch_id !== branchId) {
            return null;
        }

        return {
            ...report,
            status: report.status || (report.is_published ? 'Published' : 'Submitted')
        };
    }

    static async updateStatus(schoolId: string, branchId: string | undefined, id: string, status: string) {
        const isPublished = status === 'Published';
        const updateData: any = { 
            is_published: isPublished,
            status: status
        };

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
            status: updated?.status || (updated?.is_published ? 'Published' : 'Submitted')
        };
    }
}
