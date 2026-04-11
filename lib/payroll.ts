/**
 * Payroll Calculation Utilities
 * Handles salary calculations, tax computation, and payslip generation
 */

import { api } from './api';

// ==================== TYPES ====================

export interface TeacherSalary {
    id: string;
    teacher_id: string;
    base_salary: number;
    currency: string;
    payment_frequency: string;
    effective_date: string;
    is_active: boolean;
    components?: SalaryComponent[];
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
    id?: string;
    teacher_id: string;
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

/**
 * Format currency value
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
    try {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency || 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch (e) {
        // Fallback for invalid currency or environment issues
        const symbol = currency === 'USD' ? '$' : '₦';
        return `${symbol}${amount.toLocaleString()}`;
    }
}

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
export async function getTeacherSalary(teacherId: string): Promise<TeacherSalary | null> {
    try {
        return await api.getTeacherSalary(teacherId);
    } catch (error) {
        console.error('Error fetching teacher salary:', error);
        return null;
    }
}

/**
 * Get salary components for a teacher
 * (Already included in getTeacherSalary in the backend)
 */
export async function getSalaryComponents(salaryId: string): Promise<SalaryComponent[]> {
    // In our new backend, components are usually included in the salary object.
    // This is kept for compatibility if needed.
    return []; 
}

/**
 * Generate payslip for a teacher for a given period
 * (Calculates locally based on salary config)
 */
export async function generatePayslip(
    teacherId: string,
    periodStart: string,
    periodEnd: string
): Promise<{ payslip: Payslip; items: PayslipItem[] } | null> {
    try {
        const salary = await getTeacherSalary(teacherId);
        if (!salary) return null;

        const components = salary.components || [];

        const { gross, allowances, bonuses } = calculateGrossSalary(
            salary.base_salary,
            components
        );

        const { total: totalDeductions, tax, pension, other } = calculateDeductions(
            gross,
            components
        );

        const net = calculateNetSalary(gross, totalDeductions);

        const items: PayslipItem[] = [];
        items.push({ item_type: 'Earning', item_name: 'Base Salary', amount: salary.base_salary, is_taxable: true });

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

        items.push({ item_type: 'Deduction', item_name: 'Income Tax (PAYE)', amount: tax, is_taxable: false });
        items.push({ item_type: 'Deduction', item_name: 'Pension (8%)', amount: pension, is_taxable: false });

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
        console.error('Error in local payslip calculation:', error);
        return null;
    }
}

/**
 * Generate and save payslip to database
 */
export async function generateAndSavePayslip(
    teacherId: string,
    periodStart: string,
    periodEnd: string
): Promise<string | null> {
    try {
        const result = await generatePayslip(teacherId, periodStart, periodEnd);
        if (!result) return null;

        const saved = await api.generatePayslip({
            teacherId,
            periodStart,
            periodEnd,
            ...result.payslip,
            items: result.items
        });

        return saved.id;
    } catch (error) {
        console.error('Error generating/saving payslip:', error);
        return null;
    }
}

/**
 * Get payslips for a teacher
 */
export async function getTeacherPayslips(
    teacherId: string,
    limit: number = 12
): Promise<Payslip[]> {
    try {
        const payslips = await api.getTeacherPayslips(teacherId);
        return payslips || [];
    } catch (error) {
        console.error('Error fetching payslips:', error);
        return [];
    }
}

/**
 * Approve payslip
 */
export async function approvePayslip(
    payslipId: string,
    approvedBy: string
): Promise<boolean> {
    try {
        await api.approvePayslip(payslipId);
        return true;
    } catch (error) {
        console.error('Error approving payslip:', error);
        return false;
    }
}

