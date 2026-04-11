import { Request, Response } from 'express';
import { SaaSAnalyticsService } from '../services/saas-analytics.service';

export const getOverviewStats = async (req: Request, res: Response) => {
    try {
        const stats = await SaaSAnalyticsService.getOverviewStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getChartsData = async (req: Request, res: Response) => {
    try {
        const data = await SaaSAnalyticsService.getChartsData();
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
