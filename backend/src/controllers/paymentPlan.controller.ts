import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// Payment plans are keyed by fee/student, not by the caller directly. Routes
// on this resource only enforce school/branch scoping, so without this check
// any authenticated parent (or student) could view, "pay", or the admin-only
// endpoints could cancel/delete another family's payment plan just by
// guessing a fee id / installment id / plan id within the same school —
// the same class of cross-parent leak fixed earlier for savings goals.
// Returns null for admin/teacher (no restriction), or the caller's own
// linked student ids for PARENT/STUDENT roles.
async function getAllowedStudentIds(req: AuthRequest): Promise<string[] | null> {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return student ? [student.id] : [];
    }
    if (role === 'PARENT') {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return [];
        const links = await prisma.parentChild.findMany({ where: { parent_id: parent.id }, select: { student_id: true } });
        return links.map(l => l.student_id);
    }
    if (isAdmin(req) || role === 'TEACHER') return null;
    return [];
}

export const createPaymentPlan = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create payment plans' });
        const { fee_id, student_id, total_amount, installment_count, frequency, status } = req.body;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);

        if (!fee_id || typeof fee_id !== 'string') {
            return res.status(400).json({ message: 'fee_id is required' });
        }
        if (!student_id || typeof student_id !== 'string') {
            return res.status(400).json({ message: 'student_id is required' });
        }
        if (typeof total_amount !== 'number' || total_amount <= 0) {
            return res.status(400).json({ message: 'total_amount must be a positive number' });
        }
        if (!Number.isInteger(installment_count) || installment_count < 1) {
            return res.status(400).json({ message: 'installment_count must be a positive integer' });
        }
        if (!frequency || !['weekly', 'monthly', 'termly'].includes(frequency)) {
            return res.status(400).json({ message: 'frequency must be one of: weekly, monthly, termly' });
        }

        // Confirm the student actually belongs to this admin's tenant before
        // creating a payment plan against them — otherwise a plan could be
        // created for a student in a different school/branch entirely.
        const student = await prisma.student.findFirst({
            where: { id: student_id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            select: { id: true }
        });
        if (!student) {
            return res.status(404).json({ message: 'Student not found in your school/branch' });
        }

        const plan = await (prisma.paymentPlan.create as any)({
            data: {
                fee_id,
                student_id,
                total_amount,
                installment_count,
                frequency,
                status: status || 'active',
                school_id: schoolId,
                branch_id: branchId || null,
            }
        });

        res.status(201).json(plan);
    } catch (error: any) {
        console.error('Error creating payment plan:', error);
        sendError(res, error, 'paymentPlan.controller.ts');
    }
};

export const createInstallments = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create installments' });
        const { installments } = req.body;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);

        if (!Array.isArray(installments) || installments.length === 0) {
            return res.status(400).json({ message: 'installments must be a non-empty array' });
        }

        // Every installment must belong to a payment plan already confirmed to
        // be in this admin's tenant — otherwise installments could be attached
        // to another school's payment plan.
        const planIds = [...new Set(installments.map((i: any) => i.payment_plan_id))];
        const ownedPlans = await prisma.paymentPlan.findMany({
            where: { id: { in: planIds as number[] }, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            select: { id: true }
        });
        const ownedIds = new Set(ownedPlans.map(p => p.id));
        if (planIds.some(id => !ownedIds.has(id as number))) {
            return res.status(403).json({ message: 'One or more payment plans are not in your school/branch' });
        }

        const result = await prisma.installment.createMany({
            data: installments.map((i: any) => ({ ...i, school_id: schoolId, branch_id: branchId || null }))
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating installments:', error);
        sendError(res, error, 'paymentPlan.controller.ts');
    }
};

export const getPaymentPlanByFeeId = async (req: AuthRequest, res: Response) => {
    try {
        const { feeId } = req.params;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);

        const plan = await prisma.paymentPlan.findFirst({
            where: { fee_id: feeId as string, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }
        });

        if (!plan) {
            return res.json(null);
        }

        const allowedStudentIds = await getAllowedStudentIds(req);
        if (allowedStudentIds && !allowedStudentIds.includes(plan.student_id)) {
            return res.json(null);
        }

        const installments = await prisma.installment.findMany({
            where: { payment_plan_id: plan.id },
            orderBy: { installment_number: 'asc' }
        });

        res.json({ plan, installments });
    } catch (error: any) {
        console.error('Error getting payment plan:', error);
        sendError(res, error, 'paymentPlan.controller.ts');
    }
};

export const getUpcomingInstallments = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, daysAhead } = req.query;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);
        if (!studentId) return res.status(400).json({ message: 'studentId required' });

        const allowedStudentIds = await getAllowedStudentIds(req);
        if (allowedStudentIds && !allowedStudentIds.includes(studentId as string)) {
            return res.json([]);
        }

        const days = parseInt(daysAhead as string) || 7;
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        const installments = await prisma.installment.findMany({
            where: {
                school_id: schoolId,
                ...(branchId ? { branch_id: branchId } : {}),
                payment_plan: {
                    student_id: studentId as string
                },
                status: { in: ['pending', 'partial'] },
                due_date: {
                    gte: today,
                    lte: futureDate
                }
            },
            include: {
                payment_plan: true
            },
            orderBy: { due_date: 'asc' }
        });

        res.json(installments);
    } catch (error: any) {
        console.error('Error getting upcoming installments:', error);
        sendError(res, error, 'paymentPlan.controller.ts');
    }
};

export const updatePaymentPlanStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update payment plan status' });
        const id = req.params.id as string;
        const { status } = req.body;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);

        const result = await prisma.paymentPlan.updateMany({
            where: { id: parseInt(id), school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            data: { status }
        });
        if (result.count === 0) {
            return res.status(404).json({ message: 'Payment plan not found in your school/branch' });
        }

        const updated = await prisma.paymentPlan.findUnique({ where: { id: parseInt(id) } });
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating payment plan status:', error);
        sendError(res, error, 'paymentPlan.controller.ts');
    }
};

export const processInstallmentPayment = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { amount, transactionId } = req.body;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);

        const installment = await prisma.installment.findFirst({
            where: { id: parseInt(id), school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            include: { payment_plan: { select: { student_id: true } } }
        });

        if (!installment) {
            return res.status(404).json({ message: 'Installment not found in your school/branch' });
        }

        const allowedStudentIds = await getAllowedStudentIds(req);
        if (allowedStudentIds && !allowedStudentIds.includes(installment.payment_plan.student_id)) {
            return res.status(404).json({ message: 'Installment not found in your school/branch' });
        }

        const newPaidAmount = (installment.paid_amount || 0) + parseFloat(amount);
        // Mirror FeeService/ParentService.recordPayment's paid-vs-partial logic —
        // without this, status stayed 'pending'/'partial' forever after a full
        // payment, so the parent-facing schedule kept showing "Pay Now" on an
        // already-settled installment (risking a double charge) and the
        // progress bar / upcoming-installments reminder never reflected the
        // real balance.
        const newStatus = newPaidAmount >= (installment.amount || 0) ? 'paid' : 'partial';

        const updated = await prisma.installment.update({
            where: { id: parseInt(id) },
            data: {
                paid_amount: newPaidAmount,
                status: newStatus,
                transaction_id: transactionId ? parseInt(transactionId) : null
            }
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Error processing installment payment:', error);
        sendError(res, error, 'paymentPlan.controller.ts');
    }
};

export const deletePaymentPlan = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete payment plans' });
        const id = req.params.id as string;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);

        const result = await prisma.paymentPlan.deleteMany({
            where: { id: parseInt(id), school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }
        });
        if (result.count === 0) {
            return res.status(404).json({ message: 'Payment plan not found in your school/branch' });
        }

        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting payment plan:', error);
        sendError(res, error, 'paymentPlan.controller.ts');
    }
};
