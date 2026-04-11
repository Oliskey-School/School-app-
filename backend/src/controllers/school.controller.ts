import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';

export const getPilotOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        if (!schoolId) return res.status(400).json({ message: 'School context required' });
        const data = await SchoolService.getPilotOnboardingData(schoolId);
        if (!data) return res.status(404).json({ message: 'School not found' });
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
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

export const listSchools = async (req: Request, res: Response) => {
    try {
        const schools = await SchoolService.getAllSchools();
        res.json(schools);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const updateSchool = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SchoolService.updateSchool(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSchoolById = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SchoolService.getSchoolById(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSchoolStatusBulk = async (req: AuthRequest, res: Response) => {
    try {
        const { ids, status } = req.body;
        const result = await SchoolService.updateSchoolStatusBulk(req.user.school_id, ids, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteSchoolsBulk = async (req: AuthRequest, res: Response) => {
    try {
        const { ids } = req.body;
        const result = await SchoolService.deleteSchoolsBulk(req.user.school_id, ids);
        res.json({ success: result });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
