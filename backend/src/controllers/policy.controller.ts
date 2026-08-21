import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { PolicyService } from '../services/policy.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getPolicies = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const result = await PolicyService.getPolicies(schoolId, branchId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createPolicy = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await PolicyService.createPolicy(schoolId, branchId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deletePolicy = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);
        const { id } = req.params;
        await PolicyService.deletePolicy(schoolId, branchId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getPermissionSlips = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);

        // A parent sees THEIR OWN sign-off status, not the school-wide admin
        // status on the shared slip — their answer is stored per child.
        if ((req.user.role || '').toLowerCase() === 'parent') {
            const parent = await prisma.parent.findFirst({
                where: { user_id: req.user.id, school_id: schoolId },
                select: { id: true }
            });
            const links = parent
                ? await prisma.parentChild.findMany({
                    where: { parent_id: parent.id, deleted_at: null },
                    select: { student_id: true }
                })
                : [];
            const mine = await PolicyService.getPermissionSlipsForParent(
                schoolId, branchId, links.map(l => l.student_id)
            );
            return res.json({ data: mine, error: null });
        }

        const result = await PolicyService.getPermissionSlips(schoolId, branchId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createPermissionSlip = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await PolicyService.createPermissionSlip(schoolId, branchId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const bulkCreatePermissionSlips = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const { slips } = req.body;
        const result = await PolicyService.bulkCreatePermissionSlips(schoolId, branchId, slips);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

export const updatePermissionSlip = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user);
        const { id } = req.params;
        const role = (req.user.role || '').toLowerCase();

        let updates = req.body;
        if (!ADMIN_ROLES.includes(role)) {
            // Non-admin callers may only be a parent recording their sign-off —
            // restrict what they can change so a student/teacher token can't
            // rewrite the slip's title/description, and only the school's own
            // admins can edit the content of a consent form.
            if (role !== 'parent') {
                return res.status(403).json({ error: 'SecurityException: Only admins or parents may update a permission slip.' });
            }

            const status = String(req.body.status || '');
            if (!['Approved', 'Rejected'].includes(status)) {
                return res.status(400).json({ error: 'status must be Approved or Rejected' });
            }

            // A permission slip is school-wide (no student_id/parent_id, one shared
            // `status`). Writing the parent's answer onto the slip flipped it for
            // EVERY family in the school. Record it as a per-student consent
            // instead, and leave the slip itself alone.
            const parent = await prisma.parent.findFirst({
                where: { user_id: req.user.id, school_id: schoolId },
                select: { id: true, full_name: true }
            });
            if (!parent) return res.status(403).json({ error: 'Parent profile not found' });

            const slip = await prisma.permissionSlip.findFirst({
                where: { id: id as string, school_id: schoolId },
                select: { id: true }
            });
            if (!slip) return res.status(404).json({ error: 'Permission slip not found' });

            const links = await prisma.parentChild.findMany({
                where: { parent_id: parent.id, deleted_at: null },
                select: { student_id: true }
            });
            const studentIds = links.map(l => l.student_id);
            if (studentIds.length === 0) {
                return res.status(400).json({ error: 'No linked children to record consent for' });
            }

            const recorded = await PolicyService.recordParentConsent(
                schoolId, branchId, id as string, studentIds, parent.full_name || 'Parent', status
            );
            return res.json({ data: recorded, error: null });
        }

        const result = await PolicyService.updatePermissionSlip(schoolId, branchId, id as string, updates);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
