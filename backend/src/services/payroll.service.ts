import prisma from '../config/database';
import { SocketService } from './socket.service';

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

    static async getPayslips(schoolId: string, teacherId: string) {
        return await prisma.payslip.findMany({
            where: {
                school_id: schoolId,
                teacher_id: teacherId
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

    static async updateSalaryArrearStatus(id: string, status: string) {
        const arrear = await prisma.salaryArrear.findUnique({ where: { id } });
        const result = await prisma.salaryArrear.update({
            where: { id },
            data: { status }
        });

        if (arrear) {
            SocketService.emitToSchool(arrear.school_id, 'payroll:updated', { action: 'arrear_status', arrearId: id });
        }
        return result;
    }

    static async getLeaveTypes(schoolId: string) {
        return await prisma.leaveType.findMany({
            where: { school_id: schoolId },
            orderBy: { name: 'asc' }
        });
    }

    static async getLeaveRequests(schoolId: string, teacherId?: string) {
        return await prisma.leaveRequest.findMany({
            where: { 
                school_id: schoolId,
                teacher_id: teacherId 
            },
            include: { type: true },
            orderBy: { created_at: 'desc' }
        });
    }

    static async submitLeaveRequest(schoolId: string, branchId: string | undefined, teacherId: string, data: any) {
        const { leave_type_id, start_date, end_date, days_requested, reason, notes } = data;
        const result = await prisma.leaveRequest.create({
            data: {
                school_id: schoolId,
                branch_id: branchId || null,
                teacher_id: teacherId,
                leave_type_id: leave_type_id,
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
}

