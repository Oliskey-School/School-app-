import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';
import { isMainAdmin } from '../utils/permissions';
import { sendError } from '../utils/httpError';

export const getPilotOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        if (!schoolId) return res.status(400).json({ message: 'School context required' });
        const data = await SchoolService.getPilotOnboardingData(schoolId);
        if (!data) return res.status(404).json({ message: 'School not found' });
        res.json(data);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const savePilotProgress = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        if (!schoolId) return res.status(400).json({ message: 'School context required' });
        const { name, curriculum_type, onboarding_step, is_onboarded } = req.body;
        const result = await SchoolService.savePilotProgress(schoolId, {
            name,
            curriculum_type,
            onboarding_step,
            is_onboarded
        });
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const onboardSchool = async (req: Request, res: Response) => {
    try {
        const result = await SchoolService.onboard(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createSchool = async (req: Request, res: Response) => {
    try {
        const school = await SchoolService.createSchool(req.body);
        res.status(201).json(school);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteSchool = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.params.id as string;
        
        // Authorization: Only SuperAdmin or Admin of the school can delete it
        if (req.user.role !== 'SUPER_ADMIN' && req.user.school_id !== schoolId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const result = await SchoolService.deleteSchool(schoolId);
        res.json({ success: true, school: result });
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const listSchools = async (req: Request, res: Response) => {
    try {
        const schools = await SchoolService.getAllSchools();
        res.json(schools);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

// Unauthenticated — only ever returns the minimal public-directory fields.
export const listPublicSchools = async (req: Request, res: Response) => {
    try {
        const schools = await SchoolService.getPublicSchoolDirectory();
        res.json(schools);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};
export const updateSchool = async (req: AuthRequest, res: Response) => {
    try {
        // School identity & branding is a school-wide setting — Main Admin only,
        // and only for THEIR OWN school. The service does not itself verify
        // ownership, so :id must be checked against the caller's verified
        // tenant here — otherwise any main admin could edit another school.
        if (!isMainAdmin(req.user)) return res.status(403).json({ message: 'Only the main admin can change school settings.' });
        if (req.user.school_id !== req.params.id) return res.status(403).json({ message: 'Unauthorized' });
        const result = await SchoolService.updateSchool(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const updateMySchool = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        if (!schoolId) return res.status(400).json({ message: 'School context required' });
        
        // Use the school_id from token as both the actor context and the target ID
        const result = await SchoolService.updateSchool(schoolId, schoolId, req.body);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const updateSchoolSubscription = async (req: AuthRequest, res: Response) => {
    try {
        // Plan / subscription is school-wide — Main Admin only.
        if (!isMainAdmin(req.user)) return res.status(403).json({ message: 'Only the main admin can change the subscription/plan.' });
        const schoolId = req.user.school_id;
        if (!schoolId) return res.status(400).json({ message: 'School context required' });
        // :id is client-supplied and must be checked against the caller's verified
        // tenant — same rule as updateSchool above. Without this, any main admin
        // (including a demo visitor) could change another school's plan and read
        // its record back.
        if (schoolId !== req.params.id) return res.status(403).json({ message: 'Unauthorized' });

        const updates: any = {};
        const { planType, subscriptionStatus, trialEndsAt, isPremium } = req.body;

        if (planType) updates.plan_type = planType;
        if (subscriptionStatus) updates.subscription_status = subscriptionStatus;
        if (typeof isPremium !== 'undefined') updates.is_premium = isPremium;
        if (trialEndsAt) updates.trial_ends_at = new Date(trialEndsAt);

        const result = await SchoolService.updateSchoolSubscription(schoolId, req.params.id as string, updates);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const getSchoolById = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SchoolService.getSchoolById(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const updateSchoolStatusBulk = async (req: AuthRequest, res: Response) => {
    try {
        const { ids, status } = req.body;
        const result = await SchoolService.updateSchoolStatusBulk(req.user.school_id, ids, status);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const deleteSchoolsBulk = async (req: AuthRequest, res: Response) => {
    try {
        const { ids } = req.body;
        const result = await SchoolService.deleteSchoolsBulk(req.user.school_id, ids);
        res.json({ success: result });
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const getSchoolPolicies = async (req: AuthRequest, res: Response) => {
    try {
        // These are internal governance documents, not part of the public
        // school directory — always scope to the caller's OWN verified
        // tenant, never trust the :id route param (would otherwise let any
        // authenticated user read another school's policies).
        if (req.user.role !== 'SUPER_ADMIN' && req.user.school_id !== req.params.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const id = req.params.id as string;
        const result = await SchoolService.getSchoolPolicies(id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};

export const getSchoolPhotos = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.school_id !== req.params.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const id = req.params.id as string;
        const result = await SchoolService.getSchoolPhotos(id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'school.controller.ts');
    }
};
