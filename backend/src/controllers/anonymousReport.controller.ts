import { Request, Response } from 'express';
import { AnonymousReportService } from '../services/anonymousReport.service';

export const createAnonymousReport = async (req: Request, res: Response) => {
    try {
        // school_id is NOT NULL on the row and the client never sends one, so it
        // must come from the verified token — never from req.body, which would let
        // a caller file a report into another school.
        const schoolId = (req as any).user?.school_id;
        if (!schoolId) {
            return res.status(400).json({ error: 'School context required to file a report' });
        }

        const report = await AnonymousReportService.create({
            ...req.body,
            school_id: schoolId,
            branch_id: (req as any).user?.branch_id || null,
        });
        res.status(201).json(report);
    } catch (error: any) {
        console.error('Error creating anonymous report:', error);
        // Never return error.message here — the raw Prisma error carries absolute
        // source paths, the model shape and the submitted values.
        res.status(500).json({ error: 'Failed to create report' });
    }
};

export const getAnonymousReports = async (req: Request, res: Response) => {
    try {
        // Admin read — scope to the authenticated tenant, never a client-supplied id.
        const schoolId = (req as any).user?.school_id || (req as any).schoolId;
        const reports = await AnonymousReportService.getAll(schoolId);
        res.json(reports);
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

export const getReportByTrackCode = async (req: Request, res: Response) => {
    try {
        const report = await AnonymousReportService.getByTrackCode(req.params.trackCode as string);
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

export const updateReportStatus = async (req: any, res: Response) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) {
            return res.status(401).json({ error: 'Tenant context missing' });
        }
        const { status, admin_notes } = req.body;
        const report = await AnonymousReportService.updateStatus(schoolId, req.params.id, status, admin_notes);
        res.json(report);
    } catch (error: any) {
        console.error('Error updating report:', error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update report' });
    }
};
