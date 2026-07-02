import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const db = prisma as any;

export const getLeaveBalances = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);

        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId) where.branch_id = branchId;
        if (req.query.teacher_id) where.teacher_id = req.query.teacher_id;

        const balances = await db.leaveBalance.findMany({
            where,
            include: {
                teacher: { select: { id: true, full_name: true, school_id: true } },
                leave_type: { select: { id: true, name: true } },
            },
            orderBy: { teacher_id: 'asc' },
        });

        const formatted = balances.map((b: any) => ({
            ...b,
            teachers: b.teacher,
            leave_types: b.leave_type,
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createLeaveBalance = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);
        const { teacher_id, leave_type_id, total_days, used_days, academic_year } = req.body;

        const remaining_days = (total_days ?? 0) - (used_days ?? 0);
        const balance = await db.leaveBalance.create({
            data: {
                school_id: schoolId,
                branch_id: branchId ?? null,
                teacher_id,
                leave_type_id,
                total_days: total_days ?? 0,
                used_days: used_days ?? 0,
                remaining_days,
                academic_year: academic_year ?? null,
            },
            include: {
                teacher: { select: { id: true, full_name: true } },
                leave_type: { select: { id: true, name: true } },
            },
        });

        res.status(201).json(balance);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLeaveBalance = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { total_days, used_days, remaining_days } = req.body;

        const updated = await db.leaveBalance.update({
            where: { id },
            data: {
                ...(total_days !== undefined && { total_days }),
                ...(used_days !== undefined && { used_days }),
                ...(remaining_days !== undefined && { remaining_days }),
            },
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteLeaveBalance = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await db.leaveBalance.update({ where: { id }, data: { deleted_at: new Date() } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
