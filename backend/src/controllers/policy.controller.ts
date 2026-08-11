import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
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
            updates = { status: req.body.status };
        }

        const result = await PolicyService.updatePermissionSlip(schoolId, branchId, id as string, updates);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
