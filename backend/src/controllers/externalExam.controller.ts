import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExternalExamService } from '../services/externalExam.service';
import { sendError } from '../utils/httpError';

export const getExamBodies = async (req: AuthRequest, res: Response) => {
    try {
        // Always trust the verified token's school_id, never a client-supplied query param.
        const schoolId = req.user.school_id;
        const result = await ExternalExamService.getExamBodies(schoolId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'externalExam.controller.ts');
    }
};

export const createExamBody = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await ExternalExamService.createExamBody(schoolId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'externalExam.controller.ts');
    }
};

export const getExamRegistrations = async (req: AuthRequest, res: Response) => {
    try {
        const { bodyId } = req.params;
        const schoolId = req.user.school_id as string;
        const result = await ExternalExamService.getExamRegistrations(bodyId as string, schoolId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'externalExam.controller.ts');
    }
};

export const createExamRegistrations = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const registrations = Array.isArray(req.body) ? req.body : [req.body];
        const result = await ExternalExamService.createExamRegistrations(schoolId, registrations);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'externalExam.controller.ts');
    }
};
