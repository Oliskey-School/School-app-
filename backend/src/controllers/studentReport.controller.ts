import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { StudentReportService } from '../services/studentReport.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const createAnonymousReport = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await StudentReportService.createAnonymousReport(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createDiscreetRequest = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await StudentReportService.createDiscreetRequest(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentReports = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        
        const reports = await StudentReportService.getReports(req.user.school_id, branchId);
        res.json(reports);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
