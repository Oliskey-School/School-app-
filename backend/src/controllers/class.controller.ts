import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClassService } from '../services/class.service';

export const getClasses = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ClassService.getClasses(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createClass = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ClassService.createClass(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateClass = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ClassService.updateClass(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteClass = async (req: AuthRequest, res: Response) => {
    try {
        await ClassService.deleteClass(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
