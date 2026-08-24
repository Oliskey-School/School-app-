import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { GalleryService } from '../services/gallery.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

const STAFF_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher'];
function isStaff(req: AuthRequest): boolean {
    return STAFF_ROLES.includes((req.user.role || '').toLowerCase());
}

export const getPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await GalleryService.getPhotos(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'gallery.controller.ts');
    }
};

export const addPhoto = async (req: AuthRequest, res: Response) => {
    try {
        // Only staff may publish to the shared school gallery — otherwise any
        // parent could upload arbitrary photos into every family's feed.
        if (!isStaff(req)) return res.status(403).json({ message: 'Only staff can add photos to the gallery' });
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await GalleryService.addPhoto(schoolId, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'gallery.controller.ts');
    }
};

