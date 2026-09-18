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
            // A row with branch_id NULL is school-wide. Strict equality hid such
            // rows from EVERY branch (they showed only under 'All Branches'),
            // which is how a school-wide item reached nobody. Other branches'
            // tagged rows are still excluded, so branch isolation holds.
            where.OR = [{ branch_id: branchId }, { branch_id: null }];
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

    static async updateStatus(schoolId: string, branchId: string | undefined, id: string, status: string, actor?: { id?: string; role?: string }) {
        const isPublished = status === 'Published';
        const before = await prisma.reportCard.findFirst({ where: { id, school_id: schoolId }, select: { status: true, student_id: true, term: true, session: true, branch_id: true, class_id: true } });
        if (!before) throw Object.assign(new Error('Report card not found'), { status: 404 });
        const updateData: any = { 
            is_published: isPublished,
            status: status,
            updated_by: actor?.id || null,
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
        // Who published / unpublished / approved, and when — part of the result audit trail.
        if (before.status !== status) {
            await prisma.auditLog.create({
                data: {
                    school_id: schoolId, branch_id: before.branch_id, user_id: actor?.id || null,
                    action: `report_card.${String(status).toLowerCase()}`, action_type: 'RESULT',
                    action_description: `${(actor?.role || 'user').toLowerCase()} set report card status ${before.status} → ${status}`,
                    entity_type: 'ReportCard', entity_id: id,
                    old_values: { status: before.status } as any, new_values: { status } as any,
                    metadata: { student_id: before.student_id, term: before.term, session: before.session, class_id: before.class_id, actor_role: (actor?.role || '').toLowerCase() } as any,
                }
            });
        }

        // Live-refresh the publishing screen, teacher gradebook, and the
        // student/parent results views the moment a status changes.
        SocketService.emitToSchool(schoolId, 'report-card:updated', { reportCardId: id, status });

        return {
            ...updated,
            status: updated?.status || (updated?.is_published ? 'Published' : 'Submitted')
        };
    }

    static async publishReportCards(schoolId: string, branchId: string | undefined, term: string, session: string, actor?: { id?: string; role?: string }) {
        const where: any = {
            school_id: schoolId,
            term,
            session
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const affected = await prisma.reportCard.findMany({ where: { ...where, status: { not: 'Published' } }, select: { id: true, status: true, student_id: true, branch_id: true, class_id: true } });
        const result = await prisma.reportCard.updateMany({
            where,
            data: {
                is_published: true,
                status: 'Published',
                updated_by: actor?.id || null,
            }
        });
        if (affected.length) {
            await prisma.auditLog.createMany({
                data: affected.map((c) => ({
                    school_id: schoolId, branch_id: c.branch_id, user_id: actor?.id || null,
                    action: 'report_card.published', action_type: 'RESULT',
                    action_description: `${(actor?.role || 'user').toLowerCase()} bulk-published report cards for ${term} ${session}`,
                    entity_type: 'ReportCard', entity_id: c.id,
                    old_values: { status: c.status } as any, new_values: { status: 'Published' } as any,
                    metadata: { student_id: c.student_id, term, session, class_id: c.class_id, bulk: true, actor_role: (actor?.role || '').toLowerCase() } as any,
                }))
            });
        }

        SocketService.emitToSchool(schoolId, 'report-card:updated', { term, session, status: 'Published', count: result.count });

        return { count: result.count };
    }
}
