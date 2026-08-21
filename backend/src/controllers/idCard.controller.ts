import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { IDCardService } from '../services/idCard.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

export const getIDCardStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await IDCardService.getIDCardStats(req.user.school_id);
        res.json(stats);
    } catch (error: any) {
        sendError(res, error, 'idCard.controller.ts');
    }
};

export const getIDCards = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const cards = await IDCardService.getIDCards(req.user.school_id, branchId);
        res.json(cards);
    } catch (error: any) {
        sendError(res, error, 'idCard.controller.ts');
    }
};

export const issueIDCard = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const result = await IDCardService.issueIDCard(req.user.school_id, studentId as string, req.body);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'idCard.controller.ts');
    }
};

export const getIDCardByStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const card = await IDCardService.getIDCardByStudent(req.user.school_id, studentId as string);
        res.json(card);
    } catch (error: any) {
        sendError(res, error, 'idCard.controller.ts');
    }
};
