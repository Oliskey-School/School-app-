import { api } from './api';
import { calculateGrossSalary, calculateMonthlyTax, calculatePension, calculateNetSalary } from './payroll';
import { SalaryComponent } from './payroll';

export interface PayslipItem {
    description: string;
    amount: number;
    type: 'earning' | 'deduction';
}

export interface PayslipData {
    payslip_id?: string;
    teacher_id: string;
    teacher_name: string;
    period_start: string;
    period_end: string;
    base_salary: number;
    gross_salary: number;
    total_allowances: number;
    total_bonuses: number;
    total_deductions: number;
    tax: number;
    pension: number;
    net_salary: number;
    items: PayslipItem[];
    status: 'Draft' | 'Approved' | 'Paid';
    school_id: string;
    branch_id?: string;
}

/**
 * Generate a payslip for a teacher
 */
export async function generatePayslip(
    teacherId: string,
    periodStart: string,
    periodEnd: string,
    schoolId: string,
    branchId?: string,
    allowances: PayslipItem[] = [],
    bonuses: PayslipItem[] = [],
    deductions: PayslipItem[] = []
): Promise<PayslipData | null> {
    try {
        // Get teacher and salary info via the dedicated typed endpoints — the
        // generic api.from('teacher_salaries') REST shim doesn't support
        // per-teacher filtering server-side (getTeacherSalaries ignores
        // teacher_id/single), so it always returned the whole array instead
        // of one record.
        const [salaryData, teacher] = await Promise.all([
            api.getTeacherSalary(teacherId),
            api.getTeacherById(teacherId).catch(() => null),
        ]);

        if (!salaryData || salaryData.base_salary === undefined || salaryData.base_salary === null) {
            console.error('Teacher salary not found');
            return null;
        }

        const baseSalary = Number(salaryData.base_salary);
        const teacherName = teacher?.full_name || 'Unknown';

        // Calculate salary components
        const components: SalaryComponent[] = [
            ...allowances.map(a => ({ component_type: 'Allowance', component_name: a.description, amount: a.amount, is_taxable: true, is_recurring: false } as SalaryComponent)),
            ...bonuses.map(b => ({ component_type: 'Bonus', component_name: b.description, amount: b.amount, is_taxable: true, is_recurring: false } as SalaryComponent)),
            ...deductions.map(d => ({ component_type: 'Deduction', component_name: d.description, amount: d.amount, is_taxable: false, is_recurring: false } as SalaryComponent))
        ];

        const { gross: grossSalary, allowances: totalAllowances, bonuses: totalBonuses } = calculateGrossSalary(baseSalary, components);
        const tax = calculateMonthlyTax(grossSalary);
        const pension = calculatePension(grossSalary);

        const totalAdditionalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const totalDeductions = tax + pension + totalAdditionalDeductions;
        const netSalary = calculateNetSalary(grossSalary, totalDeductions);

        // Build items array
        const items: PayslipItem[] = [
            { description: 'Base Salary', amount: baseSalary, type: 'earning' },
            ...allowances.map(a => ({ ...a, type: 'earning' as const })),
            ...bonuses.map(b => ({ ...b, type: 'earning' as const })),
            { description: 'Income Tax', amount: tax, type: 'deduction' },
            { description: 'Pension (8%)', amount: pension, type: 'deduction' },
            ...deductions.map(d => ({ ...d, type: 'deduction' as const }))
        ];

        const payslipData: PayslipData = {
            teacher_id: teacherId,
            teacher_name: teacherName,
            period_start: periodStart,
            period_end: periodEnd,
            base_salary: baseSalary,
            gross_salary: grossSalary,
            total_allowances: totalAllowances,
            total_bonuses: totalBonuses,
            total_deductions: totalDeductions,
            tax,
            pension,
            net_salary: netSalary,
            items,
            status: 'Draft',
            school_id: schoolId,
            branch_id: branchId
        };

        return payslipData;
    } catch (error) {
        console.error('Error generating payslip:', error);
        return null;
    }
}

/**
 * Save payslip to database
 */
export async function savePayslip(payslipData: PayslipData): Promise<string | null> {
    try {
        // Saved through the real payroll endpoint (creates the payslip and its
        // items in one transaction) — the generic api.from('payslips')/
        // ('payslip_items') REST shim has no backing routes for those tables.
        const payslip = await api.generatePayslip({
            teacherId: payslipData.teacher_id,
            branch_id: payslipData.branch_id,
            periodStart: payslipData.period_start,
            periodEnd: payslipData.period_end,
            grossSalary: payslipData.gross_salary,
            totalAllowances: payslipData.total_allowances,
            totalBonuses: payslipData.total_bonuses,
            totalDeductions: payslipData.total_deductions,
            taxAmount: payslipData.tax,
            pensionAmount: payslipData.pension,
            netSalary: payslipData.net_salary,
            items: payslipData.items.map(item => ({
                item_type: item.type === 'earning' ? 'Earning' : 'Deduction',
                item_name: item.description,
                amount: item.amount,
                is_taxable: item.type === 'earning'
            }))
        });

        if (!payslip?.id) {
            console.error('Error saving payslip: no id returned');
            return null;
        }

        return payslip.id;
    } catch (error) {
        console.error('Error in savePayslip:', error);
        return null;
    }
}

/**
 * Approve a payslip
 */
export async function approvePayslip(payslipId: string): Promise<boolean> {
    try {
        const { error } = await api
            .from('payslips')
            .update({ status: 'Approved' })
            .eq('id', payslipId);

        return !error;
    } catch (error) {
        console.error('Error approving payslip:', error);
        return false;
    }
}

/**
 * Generate payslips for all teachers for a given period
 */
export async function generateBulkPayslips(
    periodStart: string,
    periodEnd: string,
    schoolId: string,
    branchId?: string
): Promise<{ success: number; failed: number }> {
    try {
        let query = api
            .from('teacher_salaries')
            .select('teacher_id, teachers!inner(school_id, branch_id)')
            .eq('is_active', true)
            .eq('teachers.school_id', schoolId);

        if (branchId) {
            query = query.eq('teachers.branch_id', branchId);
        }

        const { data: teachers, error } = await query;

        if (error || !teachers) {
            return { success: 0, failed: 0 };
        }

        let success = 0;
        let failed = 0;

        for (const teacher of teachers) {
            const payslipData = await generatePayslip(
                teacher.teacher_id,
                periodStart,
                periodEnd,
                schoolId,
                branchId
            );

            if (payslipData) {
                const saved = await savePayslip(payslipData);
                if (saved) {
                    success++;
                } else {
                    failed++;
                }
            } else {
                failed++;
            }
        }

        return { success, failed };
    } catch (error) {
        console.error('Error in bulk generation:', error);
        return { success: 0, failed: 0 };
    }
}

