import { Request, Response } from 'express';
import { PlanService } from '../services/plan.service';

export const getAllPlans = async (req: Request, res: Response) => {
    try {
        const plans = await PlanService.getAllPlans();
        res.json(plans);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createPlan = async (req: Request, res: Response) => {
    try {
        const plan = await PlanService.createPlan(req.body);
        res.status(201).json(plan);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePlan = async (req: Request, res: Response) => {
    try {
        const plan = await PlanService.updatePlan(parseInt(req.params.id), req.body);
        res.json(plan);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePlan = async (req: Request, res: Response) => {
    try {
        await PlanService.deletePlan(parseInt(req.params.id));
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
