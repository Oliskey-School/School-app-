import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { IDCardService } from '../services/idCard.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getIDCardStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await IDCardService.getIDCardStats(req.user.school_id);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getIDCards = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const cards = await IDCardService.getIDCards(req.user.school_id, branchId);
        res.json(cards);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const issueIDCard = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const result = await IDCardService.issueIDCard(req.user.school_id, studentId, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getIDCardByStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const card = await IDCardService.getIDCardByStudent(req.user.school_id, studentId);
        res.json(card);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
