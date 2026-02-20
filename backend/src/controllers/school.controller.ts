import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';

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
        const result = await SchoolService.updateSchool(req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSchoolById = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SchoolService.getSchoolById(req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSchoolStatusBulk = async (req: AuthRequest, res: Response) => {
    try {
        const { ids, status } = req.body;
        const result = await SchoolService.updateSchoolStatusBulk(ids, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteSchoolsBulk = async (req: AuthRequest, res: Response) => {
    try {
        const { ids } = req.body;
        const result = await SchoolService.deleteSchoolsBulk(ids);
        res.json({ success: result });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
