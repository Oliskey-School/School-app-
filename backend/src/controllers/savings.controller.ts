import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SavingsService } from '../services/savings.service';

export const getParentPlans = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SavingsService.getParentPlans(req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createPlan = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SavingsService.createPlan(req.user.school_id, req.user.id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const addFunds = async (req: AuthRequest, res: Response) => {
    try {
        const { planId, amount } = req.body;
        const result = await SavingsService.addFunds(planId, amount);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
