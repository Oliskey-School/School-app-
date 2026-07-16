import prisma from '../config/database';
import { NotificationService } from './notification.service';

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class SuspensionService {
    static async getScopedStudent(schoolId: string, studentId: string, branchId?: string) {
        const student = await prisma.student.findFirst({
            where: { id: studentId, school_id: schoolId, deleted_at: null },
        });
        if (!student) throw new Error('Student not found');
        if (branchId && branchId !== 'all' && student.branch_id !== branchId) throw new Error('Student not found');
        return student;
    }

    static async issueSuspension(schoolId: string, data: any, issuedBy: { id: string; name?: string }, branchId?: string) {
        if (!data.reason?.trim()) throw new Error('Reason is required');
        if (!data.start_date) throw new Error('Start date is required');
        if (!data.return_date) throw new Error('Return date is required');
        const student = await this.getScopedStudent(schoolId, data.student_id, branchId);

        const suspension = await (prisma as any).studentSuspension.create({
            data: {
                school_id: schoolId,
                branch_id: student.branch_id ?? null,
                student_id: student.id,
                reason: data.reason.trim(),
                start_date: data.start_date,
                return_date: data.return_date,
                return_conditions: data.return_conditions?.trim() || null,
                attachment_urls: Array.isArray(data.attachment_urls) ? data.attachment_urls : [],
                issued_by: issuedBy.id,
                issued_by_name: issuedBy.name || null,
                created_by: issuedBy.id,
            }
        });

        // Notify the student and every linked parent — both must see the letter.
        const recipients: string[] = [student.user_id];
        const parentLinks = await prisma.parentChild.findMany({
            where: { student_id: student.id, school_id: schoolId, deleted_at: null },
            include: { parent: { select: { user_id: true } } },
        });
        for (const link of parentLinks) {
            if (link.parent?.user_id) recipients.push(link.parent.user_id);
        }

        for (const userId of recipients) {
            await NotificationService.createNotification(schoolId, student.branch_id ?? undefined, {
                user_id: userId,
                title: 'Suspension Letter Issued',
                message: `A suspension letter has been issued for ${student.full_name}, effective ${suspension.start_date} until ${suspension.return_date}. Please review it in your portal.`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Suspension] notification failed:', err.message));
        }

        return suspension;
    }

    static async confirmReturn(schoolId: string, id: string, data: any, actorId: string, branchId?: string) {
        const suspension = await (prisma as any).studentSuspension.findFirst({
            where: { id, school_id: schoolId, deleted_at: null }
        });
        if (!suspension) throw new Error('Suspension not found');
        await this.getScopedStudent(schoolId, suspension.student_id, branchId);
        if (suspension.status === 'returned') throw new Error('This suspension has already been closed');

        return await (prisma as any).studentSuspension.update({
            where: { id },
            data: {
                status: 'returned',
                returned_at: new Date(),
                returned_by: actorId,
                return_note: data.return_note?.trim() || null,
            }
        });
    }

    /** All suspensions (active + past) for a school/branch, with overdue flagged live. */
    static async listForSchool(schoolId: string, branchId?: string) {
        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        const rows = await (prisma as any).studentSuspension.findMany({
            where,
            include: { student: { select: { full_name: true, admission_number: true, school_generated_id: true } } },
            orderBy: { created_at: 'desc' },
        });
        const today = todayStr();
        return rows.map((s: any) => ({ ...s, is_overdue: s.status === 'active' && s.return_date < today }));
    }

    /** Suspensions for one student — used by the student's own portal and the parent portal. */
    static async listForStudent(schoolId: string, studentId: string) {
        const rows = await (prisma as any).studentSuspension.findMany({
            where: { student_id: studentId, school_id: schoolId, deleted_at: null },
            orderBy: { created_at: 'desc' },
        });
        const today = todayStr();
        return rows.map((s: any) => ({ ...s, is_overdue: s.status === 'active' && s.return_date < today }));
    }
}
