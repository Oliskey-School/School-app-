import prisma from '../config/database';
import { SocketService } from './socket.service';

export class FeeService {
    static async createFee(schoolId: string, branchId: string | undefined, data: any) {
        const fee = await (prisma.studentFee.create as any)({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                student_id: data.studentId,
                title: data.title,
                amount: parseFloat(data.amount),
                paid_amount: parseFloat(data.paidAmount || 0),
                status: data.status || 'Pending',
                due_date: new Date(data.dueDate)
            }
        });

        SocketService.emitToSchool(schoolId, 'fee:updated', { action: 'create', feeId: fee.id });
        return fee;
    }

    static async getAllFees(schoolId: string, branchId: string | undefined) {
        const fees = await prisma.studentFee.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            orderBy: { created_at: 'desc' }
        });

        // Map to camelCase for frontend
        return fees.map(fee => ({
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        }));
    }

    static async getFeeById(schoolId: string, branchId: string | undefined, id: string) {
        const fee = await prisma.studentFee.findFirst({
            where: {
                id: id,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            }
        });
        return fee ? {
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        } : null;
    }

    static async updateFee(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.paidAmount !== undefined) dbUpdates.paid_amount = updates.paidAmount;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.dueDate !== undefined) dbUpdates.due_date = new Date(updates.dueDate);

        const fee = await prisma.studentFee.update({
            where: { 
                id: id,
                school_id: schoolId
            },
            data: dbUpdates
        });

        SocketService.emitToSchool(schoolId, 'fee:updated', { action: 'update', feeId: fee.id });

        return {
            id: fee.id,
            studentId: fee.student_id,
            title: fee.title,
            amount: fee.amount,
            paidAmount: fee.paid_amount,
            status: fee.status,
            dueDate: fee.due_date,
            createdAt: fee.created_at
        };
    }

    static async recordPayment(schoolId: string, branchId: string | undefined, data: any) {
        const { feeId, studentId, amount, reference, method } = data;

        return await prisma.$transaction(async (tx) => {
            // 1. Fetch fee
            const fee = await tx.studentFee.findFirst({ 
                where: { 
                    id: feeId,
                    school_id: schoolId
                } 
            });
            if (!fee) throw new Error('Fee not found or access denied');

            const newPaidAmount = (fee.paid_amount || 0) + amount;
            const newStatus = newPaidAmount >= fee.amount ? 'Paid' : 'Partial';

            // 2. Create Payment Record
            await (tx.payment.create as any)({
                data: {
                    school_id: schoolId,
                    branch_id: branchId || null,
                    student_id: studentId || null,
                    fee_id: feeId || null,
                    amount: parseFloat(amount),
                    reference: reference,
                    payment_method: method,
                    purpose: 'fee_payment',
                    status: 'Completed'
                }
            });

            // 3. Update Fee
            await tx.studentFee.update({
                where: { 
                    id: feeId,
                    school_id: schoolId
                },
                data: {
                    paid_amount: newPaidAmount,
                    status: newStatus
                }
            });

            SocketService.emitToSchool(schoolId, 'fee:updated', { action: 'payment', feeId: feeId });

            return { success: true };
        });
    }

    static async getPaymentHistory(schoolId: string, branchId: string | undefined, studentId?: string) {
        const payments = await prisma.payment.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                student_id: studentId,
                purpose: 'fee_payment'
            },
            orderBy: { created_at: 'desc' }
        });

        return payments.map(tx => ({
            id: tx.id,
            studentId: tx.student_id,
            feeId: tx.fee_id,
            amount: tx.amount,
            reference: tx.reference,
            date: tx.payment_date,
            status: tx.status,
            method: tx.payment_method
        }));
    }

    static async getFinancialAnalytics(schoolId: string, branchId: string | undefined, periodType: string, startDate: string, endDate: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const branchFilter = branchId && branchId !== 'all' ? { branch_id: branchId } : {};

        // 1. Fetch Revenue (Fees)
        const payments = await prisma.payment.findMany({
            where: {
                school_id: schoolId,
                ...branchFilter,
                payment_date: { gte: start, lte: end },
                status: 'Completed'
            }
        });

        // 2. Fetch Expenses (Payroll)
        const payslips = await prisma.payslip.findMany({
            where: {
                school_id: schoolId,
                ...branchFilter,
                period_start: { gte: start },
                period_end: { lte: end },
                status: 'Paid'
            }
        });

        // 3. Fetch Budgets for other expenses
        const budgets = await (prisma as any).budget.findMany({
            where: {
                school_id: schoolId,
                ...branchFilter
            }
        });

        const studentFees = await prisma.studentFee.findMany({
            where: {
                school_id: schoolId,
                ...branchFilter
            }
        });

        const feeRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        const donationRevenue = payments.filter(p => p.purpose === 'donation').reduce((sum, p) => sum + p.amount, 0);
        
        const salaryExpenses = payslips.reduce((sum, p) => sum + p.net_salary, 0);
        
        // Sum expenses by category from budget 'spent_amount' field
        const operationalExpenses = budgets.filter((b: any) => b.category.toLowerCase().includes('operat')).reduce((sum: number, b: any) => sum + b.spent_amount, 0);
        const maintenanceExpenses = budgets.filter((b: any) => b.category.toLowerCase().includes('maint')).reduce((sum: number, b: any) => sum + b.spent_amount, 0);
        const otherExpenses = budgets.filter((b: any) => !b.category.toLowerCase().includes('operat') && !b.category.toLowerCase().includes('maint')).reduce((sum: number, b: any) => sum + b.spent_amount, 0);

        const totalRevenue = feeRevenue + donationRevenue;
        const totalExpenses = salaryExpenses + operationalExpenses + maintenanceExpenses + otherExpenses;
        const netIncome = totalRevenue - totalExpenses;

        const totalFeesGoal = studentFees.reduce((sum, f) => sum + f.amount, 0);
        const totalFeesCollected = studentFees.reduce((sum, f) => sum + f.paid_amount, 0);
        const outstanding = Math.max(0, totalFeesGoal - totalFeesCollected);
        const rate = totalFeesGoal > 0 ? (totalFeesCollected / totalFeesGoal) * 100 : 0;

        // Payment Methods
        const methodMap: any = {};
        payments.forEach(p => {
            methodMap[p.payment_method] = (methodMap[p.payment_method] || 0) + p.amount;
        });

        const paymentMethods = Object.entries(methodMap).map(([method, amount]) => ({
            method,
            amount,
            count: payments.filter(p => p.payment_method === method).length,
            percentage: totalRevenue > 0 ? ((amount as number) / totalRevenue) * 100 : 0
        })).sort((a, b) => (b.amount as number) - (a.amount as number));

        return {
            summary: {
                period_type: periodType,
                period_start: startDate,
                period_end: endDate,
                fee_revenue: feeRevenue,
                donation_revenue: donationRevenue,
                grant_revenue: 0, // Model pending
                other_revenue: 0,
                total_revenue: totalRevenue,
                salary_expenses: salaryExpenses,
                operational_expenses: operationalExpenses,
                maintenance_expenses: maintenanceExpenses,
                other_expenses: otherExpenses,
                total_expenses: totalExpenses,
                net_income: netIncome
            },
            paymentMethods,
            feeCollection: {
                collected: totalFeesCollected,
                outstanding,
                rate: Math.round(rate * 10) / 10
            }
        };
    }

    static async getTransactions(schoolId: string, feeId: string) {
        const transactions = await prisma.payment.findMany({
            where: {
                school_id: schoolId,
                fee_id: feeId
            },
            orderBy: { created_at: 'desc' }
        });

        return transactions.map(tx => ({
            id: tx.id,
            fee_id: tx.fee_id,
            student_id: tx.student_id,
            amount: tx.amount,
            reference: tx.reference,
            status: tx.status,
            payment_method: tx.payment_method,
            created_at: tx.created_at
        }));
    }

    static async updateFeeStatus(schoolId: string, branchId: string | undefined, id: string, status: string) {
        return await prisma.studentFee.update({
            where: { id, school_id: schoolId },
            data: { status }
        });
    }

    static async deleteFee(schoolId: string, branchId: string | undefined, id: string) {
        return await prisma.studentFee.delete({
            where: { id, school_id: schoolId }
        });
    }

    static async getFeesByStudentIds(schoolId: string, branchId: string | undefined, studentIds: string[], statusList?: string[]) {
        return await prisma.studentFee.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                student_id: { in: studentIds },
                status: statusList ? { in: statusList } : undefined
            }
        });
    }

    static async deletePayment(schoolId: string, branchId: string | undefined, id: string) {
        return await prisma.payment.delete({
            where: { id, school_id: schoolId }
        });
    }

    static async getBudgets(schoolId: string, branchId: string | undefined) {
        return await prisma.budget.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            orderBy: { fiscal_year: 'desc' }
        });
    }

    static async createBudget(schoolId: string, branchId: string | undefined, data: any) {
        return await prisma.budget.create({
            data: {
                school: { connect: { id: schoolId } },
                branch: branchId && branchId !== 'all' ? { connect: { id: branchId } } : undefined,
                fiscal_year: data.fiscal_year || data.year,
                category: data.category,
                allocated_amount: parseFloat(data.allocated_amount || data.amount),
                spent_amount: parseFloat(data.spent_amount || data.spent || 0)
            }
        });
    }

    static async getArrears(schoolId: string, branchId: string | undefined) {
        return await (prisma.studentFee.findMany as any)({
            where: {
                school_id: schoolId,
                status: { not: 'Paid' },
                due_date: { lt: new Date() }
            },
            include: { student: true }
        });
    }

    static async updateArrearStatus(id: string, status: string) {
        return await prisma.studentFee.update({
            where: { id },
            data: { status }
        });
    }
}
