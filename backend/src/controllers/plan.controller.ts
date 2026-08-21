import { Request, Response } from 'express';
import { PlanService } from '../services/plan.service';
import { sendError } from '../utils/httpError';

export const getPlanStatus = async (req: Request, res: Response) => {
    try {
        const { schoolId } = req.query;
        if (!schoolId) {
            return res.status(400).json({ message: 'schoolId is required' });
        }
        const status = await PlanService.getPlanStatus(schoolId as string);
        if (!status) {
            return res.status(404).json({ message: 'School not found' });
        }
        res.json(status);
    } catch (error: any) {
        sendError(res, error, 'plan.controller.ts');
    }
};

export const getAllPlans = async (req: Request, res: Response) => {
    try {
        const plans = await PlanService.getAllPlans();
        res.json(plans);
    } catch (error: any) {
        sendError(res, error, 'plan.controller.ts');
    }
};

export const createPlan = async (req: Request, res: Response) => {
    try {
        const plan = await PlanService.createPlan(req.body);
        res.status(201).json(plan);
    } catch (error: any) {
        sendError(res, error, 'plan.controller.ts');
    }
};

export const updatePlan = async (req: Request, res: Response) => {
    try {
        const plan = await PlanService.updatePlan(parseInt(req.params.id as string), req.body);
        res.json(plan);
    } catch (error: any) {
        sendError(res, error, 'plan.controller.ts');
    }
};

export const recordSubscriptionPayment = async (req: Request, res: Response) => {
    try {
        const { schoolId, amount, reference, planType } = req.body;
        if (!schoolId || !amount || !reference || !planType) {
            return res.status(400).json({ message: 'Missing required subscription details' });
        }
        const result = await PlanService.recordSubscriptionPayment(schoolId, amount, reference, planType);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'plan.controller.ts');
    }
};

export const deletePlan = async (req: Request, res: Response) => {
    try {
        await PlanService.deletePlan(parseInt(req.params.id as string));
        res.status(204).send();
    } catch (error: any) {
        sendError(res, error, 'plan.controller.ts');
    }
};
