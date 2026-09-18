import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { StudentReportService } from '../services/studentReport.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

export const createAnonymousReport = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await StudentReportService.createAnonymousReport(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'studentReport.controller.ts');
    }
};

export const createDiscreetRequest = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        let studentId: string | null = null;
        if ((req.user.role || '').toLowerCase() === 'student' && req.body?.is_anonymous === false) {
            const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            studentId = student?.id || null;
        }
        const result = await StudentReportService.createDiscreetRequest(req.user.school_id, branchId, req.body, { id: req.user.id, studentId });
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'studentReport.controller.ts');
    }
};

export const getDiscreetRequests = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id as string) || (req.query.branchId as string));
        res.json(await StudentReportService.getDiscreetRequests(req.user.school_id, branchId));
    } catch (error: any) {
        sendError(res, error, 'studentReport.controller.ts');
    }
};

export const updateDiscreetRequestStatus = async (req: AuthRequest, res: Response) => {
    try {
        res.json(await StudentReportService.updateDiscreetRequestStatus(req.user.school_id, String(req.params.id), req.body?.status, req.user.id));
    } catch (error: any) {
        sendError(res, error, 'studentReport.controller.ts');
    }
};

export const getStudentReports = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        
        const reports = await StudentReportService.getReports(req.user.school_id, branchId);
        res.json(reports);
    } catch (error: any) {
        sendError(res, error, 'studentReport.controller.ts');
    }
};
