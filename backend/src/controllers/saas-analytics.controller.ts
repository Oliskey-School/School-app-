import { Request, Response } from 'express';
import { SaaSAnalyticsService } from '../services/saas-analytics.service';
import { sendError } from '../utils/httpError';

export const getOverviewStats = async (req: Request, res: Response) => {
    try {
        const stats = await SaaSAnalyticsService.getOverviewStats();
        res.json(stats);
    } catch (error: any) {
        sendError(res, error, 'saas-analytics.controller.ts');
    }
};

export const getChartsData = async (req: Request, res: Response) => {
    try {
        const data = await SaaSAnalyticsService.getChartsData();
        res.json(data);
    } catch (error: any) {
        sendError(res, error, 'saas-analytics.controller.ts');
    }
};
