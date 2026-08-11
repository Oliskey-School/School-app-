import prisma from '../config/database';
import { SocketService } from './socket.service';
import { SubstituteService } from './substitute.service';

export class PayrollService {
    static async getTeacherSalary(schoolId: string, teacherId: string) {
        return await prisma.teacherSalary.findFirst({
            where: {
                school_id: schoolId,
                teacher_id: teacherId,
                is_active: true
            },
            include: { components: true }
        });
    }

    static async getSalaryComponents(salaryId: string) {
        return await prisma.salaryComponent.findMany({
            where: {
                teacher_salary_id: salaryId,
                is_recurring: true
            }
        });
    }

    static async getPayslips(schoolId: string, teacherId: string, branchId?: string) {
        return await prisma.payslip.findMany({
            where: {
                school_id: schoolId,
                teacher_id: teacherId,
                ...(branchId ? { branch_id: branchId } : {})
            },
            include: { PayslipItem: true },
            orderBy: { period_start: 'desc' }
        });
    }

    static async savePayslip(schoolId: string, branchId: string | undefined, data: any) {
        const { teacherId, periodStart, periodEnd, grossSalary, totalAllowances, totalBonuses, totalDeductions, taxAmount, pensionAmount, netSalary, items } = data;
        
        const payslipNumber = `PAY-${Date.now()}-${teacherId}`;

        return await prisma.$transaction(async (tx) => {
            const payslip = await tx.payslip.create({
                data: {
                    school_id: schoolId,
                    branch_id: branchId || null,
                    teacher_id: teacherId,
                    payslip_number: payslipNumber,
                    period_start: new Date(periodStart),
                    period_end: new Date(periodEnd),
                    gross_salary: grossSalary,
                    total_allowances: totalAllowances,
                    total_bonuses: totalBonuses,
                    total_deductions: totalDeductions,
                    tax_amount: taxAmount,
                    pension_amount: pensionAmount,
                    net_salary: netSalary,
                    status: 'Draft'
                }
            });

            if (items && items.length > 0) {
                await tx.payslipItem.createMany({
                    data: items.map((item: any) => ({
                        payslip_id: payslip.id,
                        school_id: schoolId,
                        branch_id: branchId || null,
                        item_type: item.item_type,
                        item_name: item.item_name,
                        amount: item.amount,
                        is_taxable: item.is_taxable !== false
                    }))
                });
            }

            SocketService.emitToSchool(schoolId, 'payroll:updated', { action: 'save_payslip', payslipId: payslip.id, teacherId });
            return payslip;
        });
    }

    static async approvePayslip(schoolId: string, payslipId: string, approvedBy: string) {
        const result = await prisma.payslip.update({
            where: { 
                id: payslipId,
                school_id: schoolId
            },
            data: {
                status: 'Approved',
                approved_by: approvedBy,
                approved_at: new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'payroll:updated', { action: 'approve_payslip', payslipId });
        return result;
    }

    /** Records a payment against a payslip and marks it Paid — one transaction
     * so a crash between the two writes can never leave a payslip marked Paid
     * with no corresponding transaction record, or vice versa. */
    static async recordPayment(schoolId: string, branchId: string | undefined, data: any, actorId: string) {
        if (!data.payslip_id) throw new Error('A payslip is required');
        if (!data.amount || Number(data.amount) <= 0) throw new Error('A payment amount is required');
        if (!data.payment_method) throw new Error('A payment method is required');

        const payslip = await prisma.payslip.findFirst({ where: { id: data.payslip_id, school_id: schoolId } });
        if (!payslip) throw new Error('Payslip not found');

        const [transaction] = await prisma.$transaction([
            prisma.paymentTransaction.create({
                data: {
                    school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                    payslip_id: data.payslip_id, amount: Number(data.amount),
                    payment_date: data.payment_date ? new Date(data.payment_date) : new Date(),
                    payment_method: data.payment_method, reference: data.transaction_reference || null,
                    status: 'Completed', created_by: actorId,
                },
            }),
            prisma.payslip.update({ where: { id: data.payslip_id }, data: { status: 'Paid' } }),
        ]);

        SocketService.emitToSchool(schoolId, 'payroll:updated', { action: 'record_payment', payslipId: data.payslip_id });
        return transaction;
    }

    static async getTransactions(schoolId: string, teacherId: string) {
        return await prisma.paymentTransaction.findMany({
            where: {
                Payslip: {
                    school_id: schoolId,
                    teacher_id: teacherId
                }
            },
            include: {
                Payslip: {
                    select: {
                        period_start: true,
                        period_end: true
                    }
                }
            },
            orderBy: { payment_date: 'desc' }
        });
    }

    static async getSalaryArrears(schoolId: string, branchId?: string) {
        return await prisma.salaryArrear.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: { teacher: { select: { full_name: true } } },
            orderBy: { created_at: 'desc' }
        });
    }

    static async updateSalaryArrearStatus(schoolId: string, id: string, status: string) {
        // Tenant-scoped lookup prevents cross-school mutation via known arrear id.
        const arrear = await prisma.salaryArrear.findFirst({ where: { id, school_id: schoolId } });
        if (!arrear) {
            const err: any = new Error('Salary arrear not found');
            err.statusCode = 404;
            throw err;
        }
        const result = await prisma.salaryArrear.update({
            where: { id: arrear.id },
            data: { status }
        });
        SocketService.emitToSchool(arrear.school_id, 'payroll:updated', { action: 'arrear_status', arrearId: id });
        return result;
    }

    static async getLeaveTypes(schoolId: string) {
        return await prisma.leaveType.findMany({
            where: { school_id: schoolId },
            orderBy: { name: 'asc' }
        });
    }

    static async getLeaveRequests(schoolId: string, teacherId?: string, branchId?: string) {
        return await prisma.leaveRequest.findMany({
            where: {
                school_id: schoolId,
                ...(teacherId ? { teacher_id: teacherId } : {}),
                ...(branchId ? { branch_id: branchId } : {})
            },
            include: { type: true, teacher: { select: { id: true, full_name: true } } },
            orderBy: { created_at: 'desc' }
        });
    }

    static async submitLeaveRequest(schoolId: string, branchId: string | undefined, teacherId: string, data: any) {
        const { leave_type_id, leave_type, start_date, end_date, days_requested, reason, notes } = data;
        const result = await prisma.leaveRequest.create({
            data: {
                school_id: schoolId,
                branch_id: branchId || null,
                teacher_id: teacherId,
                leave_type_id: leave_type_id,
                leave_type: leave_type || null,
                start_date: new Date(start_date),
                end_date: new Date(end_date),
                days_requested: Number(days_requested),
                reason: reason,
                notes: notes,
                status: 'Pending'
            }
        });

        SocketService.emitToSchool(schoolId, 'leave:updated', { action: 'submit_request', requestId: result.id, teacherId });
        return result;
    }

    /** Approve/reject a leave request. On approval: decrements the teacher's
     * leave balance, marks them Absent for every date in the range (today or
     * future), and — for today's date — feeds directly into the Substitute
     * Coverage system so admins immediately see coverage suggestions. */
    static async decideLeaveRequest(schoolId: string, branchId: string | undefined, id: string, decision: 'Approved' | 'Rejected', adminComments: string | undefined, actorId: string) {
        const request = await prisma.leaveRequest.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!request) throw new Error('Leave request not found');
        if (request.status !== 'Pending') throw new Error('This request has already been decided');

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: { status: decision, admin_comments: adminComments || null },
        });

        if (decision === 'Approved') {
            const balance = await prisma.leaveBalance.findFirst({ where: { teacher_id: request.teacher_id, leave_type_id: request.leave_type_id, school_id: schoolId } });
            if (balance) {
                await prisma.leaveBalance.update({
                    where: { id: balance.id },
                    data: { used_days: balance.used_days + request.days_requested, remaining_days: Math.max(0, balance.remaining_days - request.days_requested) },
                });
            }

            const teacher = await prisma.teacher.findUnique({ where: { id: request.teacher_id }, select: { school_id: true, branch_id: true, user_id: true } });
            const dates: string[] = [];
            const cursor = new Date(request.start_date);
            while (cursor <= request.end_date) {
                dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
                cursor.setDate(cursor.getDate() + 1);
            }
            const effectiveBranch = branchId || teacher?.branch_id || undefined;
            for (const date of dates) {
                await prisma.teacherAttendance.upsert({
                    where: { teacher_id_date_branch_id: { teacher_id: request.teacher_id, date, branch_id: effectiveBranch || '' } } as any,
                    update: { status: 'Absent', approval_status: 'approved' },
                    create: { teacher_id: request.teacher_id, school_id: schoolId, branch_id: effectiveBranch || null, date, status: 'Absent', approval_status: 'approved' },
                });
            }
            const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
            if (dates.includes(todayStr)) {
                await SubstituteService.notifyAdminsOfAbsence(schoolId, effectiveBranch, request.teacher_id, todayStr)
                    .catch((err: any) => console.warn('⚠️ [Leave] substitute notify failed:', err.message));
            }
        }

        SocketService.emitToSchool(schoolId, 'leave:updated', { action: 'decision', requestId: id, status: decision });
        return updated;
    }
}

