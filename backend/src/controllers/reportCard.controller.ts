import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReportCardService } from '../services/reportCard.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getReportCards = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await ReportCardService.getReportCards(req.user.school_id, branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getReportCard = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await ReportCardService.getReportCard(id as string, req.user.school_id, branchId);
        
        if (!result) {
            return res.status(404).json({ message: 'Report card not found' });
        }
        
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Publishing (or unpublishing) makes results visible to students and parents —
// that authority belongs to school leadership, not the teacher who entered them.
const canPublish = (role?: string) =>
    ['admin', 'superadmin', 'proprietor'].includes((role || '').toLowerCase());

export const updateStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (String(req.body.status).toLowerCase() === 'published' && !canPublish(req.user.role)) {
            return res.status(403).json({ message: 'Only an admin can publish report cards.' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await ReportCardService.updateStatus(req.user.school_id, branchId, req.params.id as string, req.body.status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const publishReportCards = async (req: AuthRequest, res: Response) => {
    try {
        if (!canPublish(req.user.role)) {
            return res.status(403).json({ message: 'Only an admin can publish report cards.' });
        }
        const { term, session } = req.body;
        if (!term || !session) {
            return res.status(400).json({ message: 'Term and session are required' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await ReportCardService.publishReportCards(req.user.school_id, branchId, term, session);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
