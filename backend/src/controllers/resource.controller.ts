import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ResourceService } from '../services/resource.service';
import { getEffectiveBranchId } from '../utils/branchScope';

const UPLOAD_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher'];
function canManageResources(req: AuthRequest): boolean {
    return UPLOAD_ROLES.includes((req.user.role || '').toLowerCase());
}

export const createResource = async (req: AuthRequest, res: Response) => {
    try {
        // Only admins/teachers upload to the shared resource library (see
        // ResourceUploadModal / LessonPlanDetailScreen — the only real
        // callers). Without this, any authenticated parent/student could
        // POST arbitrary content into the school's shared resource list.
        if (!canManageResources(req)) {
            return res.status(403).json({ message: 'Only admins and teachers can upload resources' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ResourceService.createResource(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getResources = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        
        const filters = {
            category: req.query.category as string,
            subject: req.query.subject as string
        };
        
        const resources = await ResourceService.getResources(req.user.school_id, branchId, filters);
        res.json(resources);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteResource = async (req: AuthRequest, res: Response) => {
    try {
        if (!canManageResources(req)) {
            return res.status(403).json({ message: 'Only admins and teachers can delete resources' });
        }
        const { id } = req.params;
        const branchId = getEffectiveBranchId(req.user);
        await ResourceService.deleteResource(req.user.school_id, branchId, id as string);
        res.json({ message: 'Resource deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
