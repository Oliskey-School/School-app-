import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DigitalTwinService } from '../services/digitalTwin.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

export const getSnapshot = async (req: AuthRequest, res: Response) => {
    try {
        if (!ADMIN_ROLES.includes((req.user.role || '').toLowerCase())) {
            return res.status(403).json({ message: 'Only admins can view the Digital Twin dashboard' });
        }
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await DigitalTwinService.getSnapshot(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'digitalTwin.controller.ts');
    }
};
