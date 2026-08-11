import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { FeeService } from '../services/fee.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// Returns null for admin/teacher (no restriction), or the caller's own
// linked student ids for PARENT/STUDENT roles — used to stop a parent/student
// from requesting another family's fee or payment data by passing an
// arbitrary studentId.
async function getAllowedStudentIds(req: AuthRequest): Promise<string[] | null> {
    if (isAdmin(req) || req.user.role === 'TEACHER') return null;
    if (req.user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return student ? [student.id] : [];
    }
    if (req.user.role === 'PARENT') {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        const links = parent ? await prisma.parentChild.findMany({ where: { parent_id: parent.id }, select: { student_id: true } }) : [];
        return links.map(l => l.student_id);
    }
    return [];
}

export const createFee = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create fees' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await FeeService.createFee(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const notifyFeeAssignment = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can trigger fee notifications' });
        const { feeId } = req.body;
        if (!feeId) return res.status(400).json({ message: 'feeId is required' });
        await FeeService.notifyFeeAssignment(req.user.school_id, feeId);
        res.json({ success: true });
    } catch (error: any) {
        // Best-effort notification — never surface as a hard failure to the client.
        console.error('notifyFeeAssignment failed:', error.message);
        res.json({ success: true });
    }
};

export const notifyPaymentConfirmation = async (req: AuthRequest, res: Response) => {
    try {
        const { reference } = req.body;
        if (!reference) return res.status(400).json({ message: 'reference is required' });
        await FeeService.notifyPaymentConfirmation(req.user.school_id, reference);
        res.json({ success: true });
    } catch (error: any) {
        console.error('notifyPaymentConfirmation failed:', error.message);
        res.json({ success: true });
    }
};

export const getAllFees = async (req: AuthRequest, res: Response) => {
    try {
        // Whole-school fee/billing list — admin (finance) only, same gate as
        // createFee/updateFee/deleteFee below. A student's own fees are served by
        // the separate, self-scoped GET /students/me/fees endpoint.
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view the full fee list' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await FeeService.getAllFees(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getFeeById = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view a fee by id' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await FeeService.getFeeById(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFee = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update fees' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await FeeService.updateFee(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFeeStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update fee status' });
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await FeeService.updateFeeStatus(req.user.school_id, branchId, req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const deleteFee = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete fees' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        await FeeService.deleteFee(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkFetchFees = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds, statusList } = req.body;
        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'studentIds array is required' });
        }

        // Non-admins (student/parent, the only real callers of this endpoint —
        // used to view a student's own fees or a parent's linked children's fees)
        // may only ever request ids that actually belong to them. Filter the
        // requested list down to authorized ids rather than trusting the client.
        let allowedIds: string[] | null = null;
        if (!isAdmin(req)) {
            if (req.user.role === 'STUDENT') {
                const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
                allowedIds = student ? [student.id] : [];
            } else if (req.user.role === 'PARENT') {
                const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
                const links = parent ? await prisma.parentChild.findMany({ where: { parent_id: parent.id }, select: { student_id: true } }) : [];
                allowedIds = links.map(l => l.student_id);
            } else {
                allowedIds = [];
            }
        }
        const safeStudentIds = allowedIds ? (studentIds as string[]).filter(id => allowedIds!.includes(id)) : (studentIds as string[]);
        if (allowedIds && safeStudentIds.length === 0) {
            return res.json([]);
        }

        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await FeeService.getFeesByStudentIds(req.user.school_id, branchId, safeStudentIds, statusList as string[]);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getFinancialAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const { periodType, startDate, endDate } = req.query;
        if (!periodType || !startDate || !endDate) {
            return res.status(400).json({ message: 'periodType, startDate, and endDate are required' });
        }
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await FeeService.getFinancialAnalytics(
            req.user.school_id,
            branchId,
            periodType as string,
            startDate as string,
            endDate as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const recordPayment = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can record a payment' });
        const branchId = getEffectiveBranchId(req.user, (req.body?.branchId || req.body?.branch_id));
        const result = await FeeService.recordPayment(req.user.school_id, branchId, req.body);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const { studentId } = req.query;

        // Without this check a parent/student could omit studentId (returning
        // every family's payment history in the branch) or pass another
        // family's studentId and see their fee amounts/references — the same
        // class of cross-parent leak fixed for savings goals earlier.
        const allowedStudentIds = await getAllowedStudentIds(req);
        if (allowedStudentIds) {
            if (studentId) {
                if (!allowedStudentIds.includes(studentId as string)) {
                    return res.json([]);
                }
            } else if (allowedStudentIds.length === 0) {
                return res.json([]);
            } else if (allowedStudentIds.length === 1) {
                // Single-child parent / student: safe to default to their own record.
                const result = await FeeService.getPaymentHistory(req.user.school_id, branchId, allowedStudentIds[0]);
                return res.json(result);
            } else {
                // Multi-child parent with no studentId filter: aggregate across
                // only their own linked children, never the whole branch.
                const results = await Promise.all(
                    allowedStudentIds.map(id => FeeService.getPaymentHistory(req.user.school_id, branchId, id))
                );
                return res.json(results.flat());
            }
        }

        const result = await FeeService.getPaymentHistory(req.user.school_id, branchId, studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete a payment' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        await FeeService.deletePayment(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await FeeService.getBudgets(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.body?.branchId || req.body?.branch_id));
        const result = await FeeService.createBudget(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getArrears = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await FeeService.getArrears(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateArrear = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const result = await FeeService.updateArrearStatus(req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const allowedStudentIds = await getAllowedStudentIds(req);
        if (allowedStudentIds && allowedStudentIds.length === 0) return res.json([]);
        const result = await FeeService.getTransactions(req.user.school_id, req.params.id as string, allowedStudentIds || undefined);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentFeesLegacy = async (req: AuthRequest, res: Response) => {
    try {
        const { id, single } = req.query;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        
        if (id) {
            const result = await FeeService.getFeeById(req.user.school_id, branchId, id as string);
            if (single === 'true') {
                return res.json(result);
            }
            return res.json(result ? [result] : []);
        }
        
        const result = await FeeService.getAllFees(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
