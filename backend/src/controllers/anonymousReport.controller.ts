import { Request, Response } from 'express';
import { AnonymousReportService } from '../services/anonymousReport.service';

export const createAnonymousReport = async (req: Request, res: Response) => {
    try {
        const report = await AnonymousReportService.create(req.body);
        res.status(201).json(report);
    } catch (error: any) {
        console.error('Error creating anonymous report:', error);
        res.status(500).json({ error: 'Failed to create report', details: error.message });
    }
};

export const getAnonymousReports = async (req: Request, res: Response) => {
    try {
        const schoolId = (req as any).schoolId || req.query.schoolId as string;
        const reports = await AnonymousReportService.getAll(schoolId);
        res.json(reports);
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

export const getReportByTrackCode = async (req: Request, res: Response) => {
    try {
        const report = await AnonymousReportService.getByTrackCode(req.params.trackCode);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        // Only return status and dates for anonymous tracking
        res.json({
            track_code: report.track_code,
            category: report.category,
            status: report.status,
            created_at: report.created_at,
            resolved_at: report.resolved_at,
        });
    } catch (error: any) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
};

export const updateReportStatus = async (req: Request, res: Response) => {
    try {
        const { status, admin_notes } = req.body;
        const report = await AnonymousReportService.updateStatus(req.params.id, status, admin_notes);
        res.json(report);
    } catch (error: any) {
        console.error('Error updating report:', error);
        res.status(500).json({ error: 'Failed to update report' });
    }
};
