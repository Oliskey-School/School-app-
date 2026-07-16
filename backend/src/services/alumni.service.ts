import prisma from '../config/database';

const EXIT_STATUSES = ['Graduated', 'Transferred', 'Withdrawn'];
const MARK_EXIT_STATUSES = ['Transferred', 'Withdrawn'];

export class AlumniService {
    static async listPastStudents(schoolId: string, branchId?: string, filters: { year?: string; status?: string; search?: string } = {}) {
        const where: any = {
            school_id: schoolId,
            deleted_at: null,
            status: { in: filters.status ? [filters.status] : EXIT_STATUSES },
        };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        if (filters.year) where.exit_year = Number(filters.year);
        if (filters.search) {
            where.OR = [
                { full_name: { contains: filters.search, mode: 'insensitive' } },
                { admission_number: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        return await prisma.student.findMany({
            where,
            select: {
                id: true, full_name: true, admission_number: true, school_generated_id: true,
                exit_year: true, exit_class: true, exit_date: true, status: true,
                withdrawal_reason: true, avatar_url: true, branch_id: true,
                branch: { select: { name: true } },
            },
            orderBy: [{ exit_year: 'desc' }, { full_name: 'asc' }],
        });
    }

    /** A past student's row, scoped to school (and branch, for branch admins). */
    static async getScopedPastStudent(schoolId: string, studentId: string, branchId?: string) {
        const student = await prisma.student.findFirst({
            where: { id: studentId, school_id: schoolId, deleted_at: null, status: { in: EXIT_STATUSES } },
        });
        if (!student) throw new Error('Past student not found');
        if (branchId && branchId !== 'all' && student.branch_id !== branchId) {
            throw new Error('Past student not found');
        }
        return student;
    }

    /** Assembles the complete archived history for one past student. */
    static async getHistory(schoolId: string, studentId: string, branchId?: string) {
        const student = await this.getScopedPastStudent(schoolId, studentId, branchId);

        const [
            reportCards, examResults, academicPerformance, attendance, fees,
            achievements, behaviorNotes, suspensions, healthLogs, healthIncidents,
            documents, parentLinks, activities, idCards,
        ] = await Promise.all([
            prisma.reportCard.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }),
            prisma.examResult.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }).catch(() => []),
            prisma.academicPerformance.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }),
            prisma.attendance.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { date: 'desc' }, take: 200 }).catch(() => []),
            prisma.studentFee.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }),
            prisma.achievement.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }).catch(() => []),
            prisma.behaviorNote.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { date: 'desc' } }),
            (prisma as any).studentSuspension.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }),
            prisma.healthLog.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }).catch(() => []),
            prisma.healthIncident.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }).catch(() => []),
            (prisma as any).studentDocument.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null }, orderBy: { created_at: 'desc' } }),
            prisma.parentChild.findMany({
                where: { student_id: studentId, school_id: schoolId, deleted_at: null },
                include: { parent: { select: { full_name: true, email: true, phone: true, relationship: true, school_generated_id: true } } },
            }),
            prisma.studentActivity.findMany({
                where: { student_id: studentId, school_id: schoolId, deleted_at: null },
                include: { activity: { select: { name: true } } },
                orderBy: { joined_at: 'desc' },
            }).catch(() => []),
            prisma.studentIDCard.findMany({ where: { student_id: studentId, school_id: schoolId, deleted_at: null } }).catch(() => []),
        ]);

        return {
            student,
            report_cards: reportCards,
            exam_results: examResults,
            academic_performance: academicPerformance,
            attendance,
            fees,
            achievements,
            behavior_notes: behaviorNotes,
            suspensions,
            health_logs: healthLogs,
            health_incidents: healthIncidents,
            documents,
            parents: parentLinks.map((l: any) => l.parent),
            activities,
            id_cards: idCards,
        };
    }

    static async markExit(schoolId: string, studentId: string, data: any, actorId: string, branchId?: string) {
        if (!MARK_EXIT_STATUSES.includes(data.status)) {
            throw new Error(`Status must be one of: ${MARK_EXIT_STATUSES.join(', ')}`);
        }
        const student = await prisma.student.findFirst({
            where: { id: studentId, school_id: schoolId, deleted_at: null },
        });
        if (!student) throw new Error('Student not found');
        if (branchId && branchId !== 'all' && student.branch_id !== branchId) throw new Error('Student not found');
        if (EXIT_STATUSES.includes(student.status)) throw new Error('This student has already left the school');

        const exitDate = data.exit_date ? new Date(data.exit_date) : new Date();
        const className = student.grade ? `Grade ${student.grade}${student.section ? ` ${student.section}` : ''}` : null;

        return await prisma.student.update({
            where: { id: studentId },
            data: {
                status: data.status,
                withdrawal_reason: data.reason?.trim() || null,
                withdrawal_date: exitDate,
                exit_year: exitDate.getFullYear(),
                exit_class: className,
                exit_date: exitDate,
                updated_by: actorId,
            }
        });
    }

    static async updateExitInfo(schoolId: string, studentId: string, data: any, actorId: string, branchId?: string) {
        const student = await this.getScopedPastStudent(schoolId, studentId, branchId);
        return await prisma.student.update({
            where: { id: student.id },
            data: {
                ...(data.exit_year !== undefined ? { exit_year: data.exit_year ? Number(data.exit_year) : null } : {}),
                ...(data.exit_class !== undefined ? { exit_class: data.exit_class || null } : {}),
                updated_by: actorId,
            }
        });
    }
}
