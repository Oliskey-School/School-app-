import { supabase } from './supabase';
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
    tax: number;
    pension: number;
    net_salary: number;
    items: PayslipItem[];
    status: 'Draft' | 'Approved' | 'Paid';
}

/**
 * Generate a payslip for a teacher
 */
export async function generatePayslip(
    teacherId: string,
    periodStart: string,
    periodEnd: string,
    allowances: PayslipItem[] = [],
    bonuses: PayslipItem[] = [],
    deductions: PayslipItem[] = []
): Promise<PayslipData | null> {
    try {
        // Get teacher and salary info
        const { data: salaryData, error: salaryError } = await supabase
            .from('teacher_salaries')
            .select('*, teachers(full_name)')
            .eq('teacher_id', teacherId)
            .eq('is_active', true)
            .single();

        if (salaryError || !salaryData) {
            console.error('Teacher salary not found');
            return null;
        }

        const baseSalary = salaryData.base_salary;
        const teacherName = (salaryData.teachers as any)?.full_name || 'Unknown';

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
            tax,
            pension,
            net_salary: netSalary,
            items,
            status: 'Draft'
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
        // Insert payslip
        const { data: payslip, error: payslipError } = await supabase
            .from('payslips')
            .insert({
                teacher_id: payslipData.teacher_id,
                period_start: payslipData.period_start,
                period_end: payslipData.period_end,
                base_salary: payslipData.base_salary,
                gross_salary: payslipData.gross_salary,
                tax: payslipData.tax,
                pension: payslipData.pension,
                net_salary: payslipData.net_salary,
                status: payslipData.status
            })
            .select('id')
            .single();

        if (payslipError || !payslip) {
            console.error('Error saving payslip:', payslipError);
            return null;
        }

        const payslipId = payslip.id;

        // Insert payslip items
        const itemsToInsert = payslipData.items.map(item => ({
            payslip_id: payslipId,
            description: item.description,
            amount: item.amount,
            item_type: item.type === 'earning' ? 'Earning' : 'Deduction'
        }));

        const { error: itemsError } = await supabase
            .from('payslip_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('Error saving payslip items:', itemsError);
            return null;
        }

        return payslipId;
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
        const { error } = await supabase
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
    periodEnd: string
): Promise<{ success: number; failed: number }> {
    try {
        const { data: teachers, error } = await supabase
            .from('teacher_salaries')
            .select('teacher_id')
            .eq('is_active', true);

        if (error || !teachers) {
            return { success: 0, failed: 0 };
        }

        let success = 0;
        let failed = 0;

        for (const teacher of teachers) {
            const payslipData = await generatePayslip(
                teacher.teacher_id,
                periodStart,
                periodEnd
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
