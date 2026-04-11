import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { VolunteeringService } from '../services/volunteering.service';

export const getSurveys = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        // Stubbed until Survey model is in Prisma
        console.warn(`[LocalStub] getSurveys called for school ${schoolId}`);
        res.json([]);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSurveyQuestions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Stubbed until SurveyQuestion model is in Prisma
        console.warn(`[LocalStub] getSurveyQuestions called for survey ${id}`);
        res.json([]);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitSurveyResponse = async (req: AuthRequest, res: Response) => {
    try {
        const responses = req.body;
        // Stubbed until SurveyResponse model is in Prisma
        res.status(201).json({ success: true, message: 'Survey response stubbed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMentalHealthResources = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        // Stubbed until MentalHealthResource model is in Prisma
        res.json([]);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCrisisHelplines = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        // Stubbed until CrisisHelpline model is in Prisma
        res.json([]);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const triggerPanicAlert = async (req: AuthRequest, res: Response) => {
    try {
        const alertData = req.body;
        // Using AuditService or similar for local alerts, or just logging for now
        console.warn(`[EMERGENCY] Panic Alert triggered by user ${req.user.id}:`, alertData);
        res.status(201).json({ success: true, message: 'Emergency alert logged locally' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        // Stubbed until Photo model is in Prisma
        res.json([]);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getVolunteeringOpportunities = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await VolunteeringService.getOpportunities(schoolId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createVolunteeringOpportunity = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await VolunteeringService.createOpportunity(schoolId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteVolunteeringOpportunity = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await VolunteeringService.deleteOpportunity(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
