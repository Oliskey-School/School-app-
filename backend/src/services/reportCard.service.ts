import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ReportCardService {
    static async getReportCards(
        schoolId: string,
        branchId: string | undefined,
        teacherId?: string,
        // A parent/student caller must only ever see report cards for their OWN
        // linked children (or themselves) — without this, any authenticated
        // parent or student got every report card in the school/branch,
        // including full academic records of unrelated families' children.
        options?: { studentIds?: string[]; publishedOnly?: boolean }
    ) {
        const where: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId; // strict branch isolation (untagged → All Branches only)
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

        if (options?.studentIds) {
            where.student_id = { in: options.studentIds };
        }

        if (options?.publishedOnly) {
            where.is_published = true;
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

        // Live-refresh the publishing screen, teacher gradebook, and the
        // student/parent results views the moment a status changes.
        SocketService.emitToSchool(schoolId, 'report-card:updated', { reportCardId: id, status });

        return {
            ...updated,
            status: updated?.status || (updated?.is_published ? 'Published' : 'Submitted')
        };
    }

    static async publishReportCards(schoolId: string, branchId: string | undefined, term: string, session: string) {
        const where: any = {
            school_id: schoolId,
            term,
            session
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const result = await prisma.reportCard.updateMany({
            where,
            data: {
                is_published: true,
                status: 'Published'
            }
        });

        SocketService.emitToSchool(schoolId, 'report-card:updated', { term, session, status: 'Published', count: result.count });

        return { count: result.count };
    }
}
