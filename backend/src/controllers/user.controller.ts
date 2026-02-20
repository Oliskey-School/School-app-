import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        // School ID comes from the authenticated token
        const schoolId = req.user.school_id;
        const users = await UserService.getUsers(schoolId, req.query.role as string);
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const user = await UserService.createUser(schoolId, req.body);
        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const result = await UserService.getUserById(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const result = await UserService.updateUser(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
