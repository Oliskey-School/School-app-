import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { getEffectiveBranchId } from '../utils/branchScope';

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
