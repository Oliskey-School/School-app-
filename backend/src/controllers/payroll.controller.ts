import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PayrollService } from '../services/payroll.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';
import { sendError } from '../utils/httpError';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// Resolves the caller's own Teacher.id (payroll records key on Teacher.id,
// not User.id) — used to stop a teacher from reading/writing another
// teacher's payroll data by passing an arbitrary teacher_id.
async function getOwnTeacherId(req: AuthRequest): Promise<string | null> {
    const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    return teacher?.id ?? null;
}

async function assertOwnsTeacherId(req: AuthRequest, teacherId: string): Promise<boolean> {
    if (isAdmin(req)) return true;
    const ownId = await getOwnTeacherId(req);
    return !!ownId && ownId === teacherId;
}

export const getPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        
        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required' });
        }
        if (!(await assertOwnsTeacherId(req, teacherId))) {
            return res.status(403).json({ message: 'You do not have access to this teacher\'s payslips' });
        }

        // isAdmin() alone doesn't prove the caller may see THIS teacher — a
        // branch-locked admin can pass any teacher_id and pass assertOwnsTeacherId
        // above. Scoping the query itself to the admin's effective branch means a
        // teacher outside that branch returns empty instead of leaking payslips.
        const branchId = getEffectiveBranchId(req.user);
        const payslips = await PayrollService.getPayslips(req.user.school_id, teacherId, branchId);
            
        res.json(payslips || []);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const getSalaryArrears = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const arrears = await PayrollService.getSalaryArrears(schoolId, branchId as string);
        res.json(arrears);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const updateSalaryArrearStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update salary arrear status' });
        const { id } = req.params;
        const { status } = req.body;
        const updated = await PayrollService.updateSalaryArrearStatus(req.user.school_id, id as string, status);
        res.json(updated);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        
        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required' });
        }
        if (!(await assertOwnsTeacherId(req, teacherId))) {
            return res.status(403).json({ message: 'You do not have access to this teacher\'s transactions' });
        }

        const transactions = await PayrollService.getTransactions(req.user.school_id, teacherId);

        res.json(transactions || []);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const generatePayslip = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can generate payslips' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await PayrollService.savePayslip(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const approvePayslip = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can approve payslips' });
        const { id } = req.params;
        const result = await PayrollService.approvePayslip(req.user.school_id, id as string, req.user.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const getTeacherSalary = async (req: AuthRequest, res: Response) => {
    try {
        const { teacherId } = req.params;
        if (!(await assertOwnsTeacherId(req, teacherId as string))) {
            return res.status(403).json({ message: 'You do not have access to this teacher\'s salary' });
        }
        const result = await PayrollService.getTeacherSalary(req.user.school_id, teacherId as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const getSalaryProfile = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        if (!teacherId) return res.status(400).json({ message: 'Teacher ID required' });
        if (!(await assertOwnsTeacherId(req, teacherId))) {
            return res.status(403).json({ message: 'You do not have access to this teacher\'s salary profile' });
        }
        const result = await PayrollService.getTeacherSalary(req.user.school_id, teacherId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        if (!teacherId) return res.status(400).json({ message: 'Teacher ID required' });
        if (!(await assertOwnsTeacherId(req, teacherId))) {
            return res.status(403).json({ message: 'You do not have access to this teacher\'s payment history' });
        }
        const transactions = await PayrollService.getTransactions(req.user.school_id, teacherId);
        res.json(transactions || []);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const getLeaveRequests = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        if (!isAdmin(req)) {
            // A teacher may only ever see their own leave requests — no
            // teacher_id override, and no unscoped "all requests" view.
            const ownId = await getOwnTeacherId(req);
            if (!ownId) return res.status(404).json({ message: 'Teacher profile not found' });
            teacherId = ownId;
        }
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);
        const requests = await PayrollService.getLeaveRequests(schoolId, teacherId, branchId);
        res.json(requests || []);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const submitLeaveRequest = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        // Never trust a client-supplied teacher_id for who the request is
        // FOR — that let one teacher file leave in another teacher's name.
        // Only an admin filing on a teacher's behalf may specify it.
        let teacherId: string;
        if (isAdmin(req) && req.body.teacher_id) {
            teacherId = req.body.teacher_id;
        } else {
            const ownId = await getOwnTeacherId(req);
            if (!ownId) return res.status(404).json({ message: 'Teacher profile not found' });
            teacherId = ownId;
        }
        const result = await PayrollService.submitLeaveRequest(schoolId, branchId, teacherId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const getLeaveTypes = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const types = await PayrollService.getLeaveTypes(schoolId);
        res.json(types || []);
    } catch (error: any) {
        sendError(res, error, 'payroll.controller.ts');
    }
};

export const decideLeaveRequest = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Only admins can approve or reject leave requests' });
        }
        const decision = req.body.status === 'Approved' ? 'Approved' : req.body.status === 'Rejected' ? 'Rejected' : null;
        if (!decision) return res.status(400).json({ message: 'status must be Approved or Rejected' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await PayrollService.decideLeaveRequest(req.user.school_id, branchId, req.params.id as string, decision, req.body.admin_comments, req.user.id);
        res.json(result);
    } catch (error: any) {
        const status = /not found/i.test(error.message) ? 404 : /already been decided/i.test(error.message) ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};
