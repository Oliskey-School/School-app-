import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReportCardService } from '../services/reportCard.service';
import prisma from '../config/database';

export const getReportCards = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'teacher') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const branchId = req.user.branch_id || req.query.branchId as string;
        const result = await ReportCardService.getReportCards(req.user.school_id, branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getReportCard = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const branchId = req.user.branch_id || req.query.branchId as string;
        const result = await ReportCardService.getReportCard(id, req.user.school_id, branchId);
        
        if (!result) {
            return res.status(404).json({ message: 'Report card not found' });
        }
        
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await ReportCardService.updateStatus(req.user.school_id, branchId, req.params.id as string, req.body.status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
