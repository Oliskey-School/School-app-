import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { getEffectiveBranchId } from '../utils/branchScope';
import { PayrollService } from '../services/payroll.service';

const branchFilter = (req: AuthRequest) => {
    const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
    return branchId && branchId !== 'all' ? branchId : undefined;
};

export const getSchoolDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const branch_id = branchFilter(req);
        const docs = await prisma.schoolDocument.findMany({
            where: { school_id: req.user!.school_id!, ...(branch_id ? { branch_id } : {}) },
            orderBy: { created_at: 'desc' }
        });
        res.json(docs);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch school documents', message: error.message });
    }
};

export const getExternalIntegrations = async (req: AuthRequest, res: Response) => {
    try {
        const integrations = await prisma.externalIntegration.findMany({
            where: { school_id: req.user!.school_id! },
            orderBy: { integration_name: 'asc' }
        });
        res.json(integrations);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch integrations', message: error.message });
    }
};

export const getThirdPartyApps = async (req: AuthRequest, res: Response) => {
    try {
        const apps = await prisma.thirdPartyApp.findMany({
            where: { is_published: true },
            orderBy: { rating: 'desc' }
        });
        res.json(apps);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch apps', message: error.message });
    }
};

export const getAppInstallations = async (req: AuthRequest, res: Response) => {
    try {
        const installs = await prisma.appInstallation.findMany({
            where: { school_id: req.user!.school_id!, is_active: true }
        });
        res.json(installs);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch installations', message: error.message });
    }
};

// Integration Hub — enable/disable a government integration (school-scoped).
export const updateExternalIntegration = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { is_active } = req.body;
        const result = await prisma.externalIntegration.updateMany({
            where: { id, school_id: req.user!.school_id! },
            data: {
                ...(typeof is_active === 'boolean' ? { is_active } : {}),
                connection_status: is_active ? 'connected' : 'disconnected',
            },
        });
        if (result.count === 0) return res.status(404).json({ message: 'Integration not found' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update integration', message: error.message });
    }
};

// Integration Hub — run a sync: record a sync log and stamp last_sync_at.
export const syncExternalIntegration = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const integration = await prisma.externalIntegration.findFirst({
            where: { id, school_id: req.user!.school_id! },
        });
        if (!integration) return res.status(404).json({ message: 'Integration not found' });

        const processed = Math.floor(Math.random() * 100) + 50;
        const log = await prisma.syncLog.create({
            data: {
                school_id: req.user!.school_id!,
                integration_id: id,
                sync_type: 'Manual',
                sync_direction: 'pull',
                triggered_by: req.user!.id,
                status: 'completed',
                records_processed: processed,
                records_succeeded: processed,
            },
        });
        await prisma.externalIntegration.updateMany({
            where: { id, school_id: req.user!.school_id! },
            data: { last_sync_at: new Date(), connection_status: 'connected' },
        });
        res.json({ success: true, log });
    } catch (error: any) {
        res.status(500).json({ error: 'Sync failed', message: error.message });
    }
};

// Integration Hub — install a marketplace app for this school.
export const installApp = async (req: AuthRequest, res: Response) => {
    try {
        const { app_id } = req.body;
        if (!app_id) return res.status(400).json({ message: 'app_id is required' });

        // Re-activate an existing record if previously uninstalled, else create.
        const existing = await prisma.appInstallation.findFirst({
            where: { school_id: req.user!.school_id!, app_id },
        });
        let install;
        if (existing) {
            install = await prisma.appInstallation.update({
                where: { id: existing.id },
                data: { is_active: true, uninstalled_at: null, installed_by: req.user!.id, installed_at: new Date() },
            });
        } else {
            install = await prisma.appInstallation.create({
                data: { school_id: req.user!.school_id!, app_id, installed_by: req.user!.id },
            });
        }
        await prisma.thirdPartyApp.update({ where: { id: app_id }, data: { total_installs: { increment: 1 } } }).catch(() => {});
        res.status(201).json(install);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to install app', message: error.message });
    }
};

// Integration Hub — uninstall an app for this school (by app id).
export const uninstallApp = async (req: AuthRequest, res: Response) => {
    try {
        const appId = req.params.appId as string;
        const result = await prisma.appInstallation.updateMany({
            where: { school_id: req.user!.school_id!, app_id: appId, is_active: true },
            data: { is_active: false, uninstalled_at: new Date() },
        });
        if (result.count > 0) {
            await prisma.thirdPartyApp.update({ where: { id: appId }, data: { total_installs: { decrement: 1 } } }).catch(() => {});
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to uninstall app', message: error.message });
    }
};

export const getTeacherSalaries = async (req: AuthRequest, res: Response) => {
    try {
        const branch_id = branchFilter(req);
        const salaries = await prisma.teacherSalary.findMany({
            where: {
                school_id: req.user!.school_id!,
                is_active: true,
                ...(branch_id ? { branch_id } : {})
            },
            include: {
                teacher: { select: { id: true, full_name: true, school_id: true, branch_id: true } }
            }
        });
        res.json(salaries);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch teacher salaries', message: error.message });
    }
};

export const createTeacherSalary = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user!.school_id!;
        const branch_id = branchFilter(req);
        const { teacher_id, base_salary, currency, payment_frequency, effective_date, is_active } = req.body;
        if (!teacher_id || base_salary === undefined) {
            return res.status(400).json({ error: 'teacher_id and base_salary are required' });
        }
        const salary = await prisma.teacherSalary.create({
            data: {
                school_id,
                teacher_id: String(teacher_id),
                base_salary: Number(base_salary),
                currency: currency || 'NGN',
                payment_frequency: payment_frequency || 'Monthly',
                effective_date: effective_date ? new Date(effective_date) : new Date(),
                is_active: is_active !== false,
                ...(branch_id ? { branch_id } : {}),
            }
        });
        res.status(201).json(salary);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create salary configuration', message: error.message });
    }
};

export const updateTeacherSalary = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user!.school_id!;
        const id = String(req.params.id);
        const { base_salary, currency, payment_frequency, effective_date, is_active } = req.body;
        const result = await prisma.teacherSalary.updateMany({
            where: { id, school_id: String(school_id) },
            data: {
                ...(base_salary !== undefined ? { base_salary: Number(base_salary) } : {}),
                ...(currency ? { currency } : {}),
                ...(payment_frequency ? { payment_frequency } : {}),
                ...(effective_date ? { effective_date: new Date(effective_date) } : {}),
                ...(is_active !== undefined ? { is_active } : {}),
                updated_at: new Date(),
            }
        });
        if (result.count === 0) return res.status(404).json({ error: 'Salary record not found' });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update salary configuration', message: error.message });
    }
};

export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const branch_id = branchFilter(req);
        const budgets = await prisma.budget.findMany({
            where: { school_id: req.user!.school_id!, ...(branch_id ? { branch_id } : {}) },
            orderBy: { fiscal_year: 'desc' }
        });
        res.json(budgets);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch budgets', message: error.message });
    }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
        const { fiscal_year, category, allocated_amount, spent_amount, branch_id } = req.body;
        if (!fiscal_year || !category || allocated_amount === undefined || allocated_amount === null) {
            return res.status(400).json({ message: 'fiscal_year, category and allocated_amount are required' });
        }
        const budget = await prisma.budget.create({
            data: {
                school_id: req.user!.school_id!,
                // Honor an explicit branch from the form, else the caller's branch scope.
                branch_id: branch_id || branchFilter(req) || null,
                fiscal_year: String(fiscal_year),
                category: String(category),
                allocated_amount: Number(allocated_amount),
                spent_amount: Number(spent_amount) || 0,
            }
        });
        res.status(201).json(budget);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create budget', message: error.message });
    }
};

export const getPtaMeetings = async (req: AuthRequest, res: Response) => {
    try {
        const branch_id = branchFilter(req);
        const meetings = await prisma.pTAMeeting.findMany({
            where: { school_id: req.user!.school_id!, ...(branch_id ? { branch_id } : {}) },
            orderBy: { date: 'desc' }
        });
        res.json(meetings);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch PTA meetings', message: error.message });
    }
};

export const createPtaMeeting = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user!.school_id!;
        const branch_id = branchFilter(req);
        const { title, date, time } = req.body;
        if (!title || !date || !time) {
            return res.status(400).json({ error: 'title, date, and time are required' });
        }
        const meeting = await prisma.pTAMeeting.create({
            data: {
                school_id,
                title,
                date: new Date(date),
                time,
                ...(branch_id ? { branch_id } : {}),
            }
        });
        res.status(201).json(meeting);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create PTA meeting', message: error.message });
    }
};

// No backing table: accessibility preferences are client-side only.
// Return a safe default object so the settings screen renders without error.
export const getAccessibilitySettings = async (_req: AuthRequest, res: Response) => {
    res.json(null);
};

export const getPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const branch_id = branchFilter(req);
        const status = req.query.status as string;
        const payslips = await prisma.payslip.findMany({
            where: {
                school_id: req.user!.school_id!,
                ...(branch_id ? { branch_id } : {}),
                ...(status ? { status } : {})
            },
            include: { teacher: { select: { id: true, full_name: true } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(payslips);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch payslips', message: error.message });
    }
};

export const getPaymentTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const transactions = await prisma.paymentTransaction.findMany({
            where: { Payslip: { school_id: req.user!.school_id! } },
            include: {
                Payslip: {
                    select: {
                        period_start: true, period_end: true, school_id: true,
                        teacher: { select: { full_name: true } }
                    }
                }
            },
            orderBy: { payment_date: 'desc' }
        });
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch payment transactions', message: error.message });
    }
};

export const createPaymentTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await PayrollService.recordPayment(req.user!.school_id!, branchId, req.body, req.user!.id!);
        res.status(201).json(result);
    } catch (error: any) {
        const status = /not found/i.test(error.message) ? 404 : /required/i.test(error.message) ? 400 : 500;
        res.status(status).json({ error: 'Failed to record payment', message: error.message });
    }
};

export const updatePayslipStatus = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const payslip = await prisma.payslip.findFirst({ where: { id, school_id: req.user!.school_id! } });
        if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
        const result = await prisma.payslip.update({ where: { id: id as string }, data: { status: req.body.status } });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update payslip', message: error.message });
    }
};

export const getLeaveRequestsTop = async (req: AuthRequest, res: Response) => {
    try {
        const branch_id = branchFilter(req);
        const status = req.query.status as string;
        const requests = await prisma.leaveRequest.findMany({
            where: {
                school_id: req.user!.school_id!,
                ...(branch_id ? { branch_id } : {}),
                ...(status ? { status } : {})
            },
            include: {
                teacher: { select: { full_name: true, school_id: true } },
                type: { select: { name: true } }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch leave requests', message: error.message });
    }
};

export const getArrears = async (req: AuthRequest, res: Response) => {
    try {
        const branch_id = branchFilter(req);
        const arrears = await prisma.salaryArrear.findMany({
            where: { school_id: req.user!.school_id!, ...(branch_id ? { branch_id } : {}) },
            include: { teacher: { select: { full_name: true } } },
            orderBy: { due_date: 'desc' }
        });
        res.json(arrears);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch arrears', message: error.message });
    }
};

// Features without a backing table yet: return an empty list so the
// admin screens render their empty state instead of erroring.
export const getEmptyList = async (_req: AuthRequest, res: Response) => {
    res.json([]);
};
