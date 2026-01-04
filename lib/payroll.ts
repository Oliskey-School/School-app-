/**
 * Payroll Calculation Utilities
 * Handles salary calculations, tax computation, and payslip generation
 */

import { supabase } from './supabase';

// ==================== TYPES ====================

export interface TeacherSalary {
    id: number;
    teacher_id: number;
    base_salary: number;
    currency: string;
    payment_frequency: string;
    effective_date: string;
    is_active: boolean;
}

export interface SalaryComponent {
    id: number;
    component_type: 'Allowance' | 'Bonus' | 'Deduction';
    component_name: string;
    amount?: number;
    percentage?: number;
    is_taxable: boolean;
    is_recurring: boolean;
}

export interface Payslip {
    id?: number;
    teacher_id: number;
    period_start: string;
    period_end: string;
    gross_salary: number;
    total_allowances: number;
    total_bonuses: number;
    total_deductions: number;
    tax_amount: number;
    pension_amount: number;
    net_salary: number;
    status: 'Draft' | 'Approved' | 'Paid' | 'Cancelled';
}

export interface PayslipItem {
    item_type: 'Earning' | 'Deduction';
    item_name: string;
    amount: number;
    is_taxable: boolean;
}

// ==================== TAX CONFIGURATION ====================

// Nigerian tax brackets (2024) - configurable
const TAX_BRACKETS = [
    { min: 0, max: 300000, rate: 0.07 },
    { min: 300001, max: 600000, rate: 0.11 },
    { min: 600001, max: 1100000, rate: 0.15 },
    { min: 1100001, max: 1600000, rate: 0.19 },
    { min: 1600001, max: 3200000, rate: 0.21 },
    { min: 3200001, max: Infinity, rate: 0.24 }
];

const PENSION_RATE = 0.08; // 8% of gross salary
const TAX_FREE_ALLOWANCE = 200000; // Annual tax-free allowance

// ==================== CALCULATION FUNCTIONS ====================

/**
 * Calculate annual tax using progressive tax brackets
 */
export function calculateAnnualTax(annualIncome: number): number {
    let tax = 0;
    let remainingIncome = Math.max(0, annualIncome - TAX_FREE_ALLOWANCE);

    for (const bracket of TAX_BRACKETS) {
        if (remainingIncome <= 0) break;

        const taxableInBracket = Math.min(
            remainingIncome,
            bracket.max - bracket.min
        );

        tax += taxableInBracket * bracket.rate;
        remainingIncome -= taxableInBracket;
    }

    return Math.round(tax * 100) / 100;
}

/**
 * Calculate monthly tax from annual income
 */
export function calculateMonthlyTax(monthlyGross: number): number {
    const annualIncome = monthlyGross * 12;
    const annualTax = calculateAnnualTax(annualIncome);
    return Math.round((annualTax / 12) * 100) / 100;
}

/**
 * Calculate pension contribution
 */
export function calculatePension(grossSalary: number): number {
    return Math.round(grossSalary * PENSION_RATE * 100) / 100;
}

/**
 * Calculate component value (amount or percentage-based)
 */
export function calculateComponentValue(
    component: SalaryComponent,
    baseSalary: number
): number {
    if (component.amount !== undefined && component.amount !== null) {
        return component.amount;
    }
    if (component.percentage !== undefined && component.percentage !== null) {
        return Math.round(baseSalary * (component.percentage / 100) * 100) / 100;
    }
    return 0;
}

/**
 * Calculate gross salary including base + allowances + bonuses
 */
export function calculateGrossSalary(
    baseSalary: number,
    components: SalaryComponent[]
): { gross: number; allowances: number; bonuses: number } {
    let totalAllowances = 0;
    let totalBonuses = 0;

    for (const component of components) {
        const value = calculateComponentValue(component, baseSalary);

        if (component.component_type === 'Allowance') {
            totalAllowances += value;
        } else if (component.component_type === 'Bonus') {
            totalBonuses += value;
        }
    }

    const gross = baseSalary + totalAllowances + totalBonuses;

    return {
        gross: Math.round(gross * 100) / 100,
        allowances: Math.round(totalAllowances * 100) / 100,
        bonuses: Math.round(totalBonuses * 100) / 100
    };
}

/**
 * Calculate total deductions
 */
export function calculateDeductions(
    grossSalary: number,
    components: SalaryComponent[]
): { total: number; tax: number; pension: number; other: number } {
    const tax = calculateMonthlyTax(grossSalary);
    const pension = calculatePension(grossSalary);

    let otherDeductions = 0;
    for (const component of components) {
        if (component.component_type === 'Deduction') {
            otherDeductions += calculateComponentValue(component, grossSalary);
        }
    }

    const total = tax + pension + otherDeductions;

    return {
        total: Math.round(total * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        pension: Math.round(pension * 100) / 100,
        other: Math.round(otherDeductions * 100) / 100
    };
}

/**
 * Calculate net salary
 */
export function calculateNetSalary(
    grossSalary: number,
    totalDeductions: number
): number {
    return Math.round((grossSalary - totalDeductions) * 100) / 100;
}

// ==================== DATABASE FUNCTIONS ====================

/**
 * Get teacher's active salary configuration
 */
export async function getTeacherSalary(teacherId: number): Promise<TeacherSalary | null> {
    const { data, error } = await supabase
        .from('teacher_salaries')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching teacher salary:', error);
        return null;
    }

    return data;
}

/**
 * Get salary components for a teacher
 */
export async function getSalaryComponents(salaryId: number): Promise<SalaryComponent[]> {
    const { data, error } = await supabase
        .from('salary_components')
        .select('*')
        .eq('teacher_salary_id', salaryId)
        .eq('is_recurring', true);

    if (error) {
        console.error('Error fetching salary components:', error);
        return [];
    }

    return data || [];
}

/**
 * Generate payslip for a teacher for a given period
 */
export async function generatePayslip(
    teacherId: number,
    periodStart: string,
    periodEnd: string
): Promise<{ payslip: Payslip; items: PayslipItem[] } | null> {
    try {
        // Get teacher salary config
        const salary = await getTeacherSalary(teacherId);
        if (!salary) {
            throw new Error('No active salary configuration found');
        }

        // Get salary components
        const components = await getSalaryComponents(salary.id);

        // Calculate gross salary
        const { gross, allowances, bonuses } = calculateGrossSalary(
            salary.base_salary,
            components
        );

        // Calculate deductions
        const { total: totalDeductions, tax, pension, other } = calculateDeductions(
            gross,
            components
        );

        // Calculate net salary
        const net = calculateNetSalary(gross, totalDeductions);

        // Build payslip items
        const items: PayslipItem[] = [];

        // Add base salary
        items.push({
            item_type: 'Earning',
            item_name: 'Base Salary',
            amount: salary.base_salary,
            is_taxable: true
        });

        // Add allowances and bonuses
        for (const component of components) {
            if (component.component_type === 'Allowance' || component.component_type === 'Bonus') {
                items.push({
                    item_type: 'Earning',
                    item_name: component.component_name,
                    amount: calculateComponentValue(component, salary.base_salary),
                    is_taxable: component.is_taxable
                });
            }
        }

        // Add deductions
        items.push({
            item_type: 'Deduction',
            item_name: 'Income Tax (PAYE)',
            amount: tax,
            is_taxable: false
        });

        items.push({
            item_type: 'Deduction',
            item_name: 'Pension (8%)',
            amount: pension,
            is_taxable: false
        });

        for (const component of components) {
            if (component.component_type === 'Deduction') {
                items.push({
                    item_type: 'Deduction',
                    item_name: component.component_name,
                    amount: calculateComponentValue(component, gross),
                    is_taxable: false
                });
            }
        }

        // Create payslip object
        const payslip: Payslip = {
            teacher_id: teacherId,
            period_start: periodStart,
            period_end: periodEnd,
            gross_salary: gross,
            total_allowances: allowances,
            total_bonuses: bonuses,
            total_deductions: totalDeductions,
            tax_amount: tax,
            pension_amount: pension,
            net_salary: net,
            status: 'Draft'
        };

        return { payslip, items };
    } catch (error) {
        console.error('Error generating payslip:', error);
        return null;
    }
}

/**
 * Save payslip to database
 */
export async function savePayslip(
    payslip: Payslip,
    items: PayslipItem[]
): Promise<number | null> {
    try {
        // Generate payslip number
        const payslipNumber = `PAY-${Date.now()}-${payslip.teacher_id}`;

        // Insert payslip
        const { data: payslipData, error: payslipError } = await supabase
            .from('payslips')
            .insert({
                ...payslip,
                payslip_number: payslipNumber
            })
            .select()
            .single();

        if (payslipError) throw payslipError;

        // Insert payslip items
        const itemsToInsert = items.map(item => ({
            payslip_id: payslipData.id,
            ...item
        }));

        const { error: itemsError } = await supabase
            .from('payslip_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        return payslipData.id;
    } catch (error) {
        console.error('Error saving payslip:', error);
        return null;
    }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
    const symbols: Record<string, string> = {
        NGN: '₦',
        USD: '$',
        GBP: '£',
        EUR: '€'
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Get payslips for a teacher
 */
export async function getTeacherPayslips(
    teacherId: number,
    limit: number = 12
): Promise<Payslip[]> {
    const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('period_start', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching payslips:', error);
        return [];
    }

    return data || [];
}

/**
 * Approve payslip
 */
export async function approvePayslip(
    payslipId: number,
    approvedBy: number
): Promise<boolean> {
    const { error } = await supabase
        .from('payslips')
        .update({
            status: 'Approved',
            approved_by: approvedBy,
            approved_at: new Date().toISOString()
        })
        .eq('id', payslipId);

    if (error) {
        console.error('Error approving payslip:', error);
        return false;
    }

    return true;
}
