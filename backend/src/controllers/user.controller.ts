import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        // School ID comes from the authenticated token
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const term = req.query.term as string;
        const users = await UserService.getUsers(schoolId, branchId, req.query.role as string, term);
        
        // Map fields to match frontend expectations (UserAccountsScreen.tsx)
        const mappedUsers = users.map(u => ({
            ...u,
            name: u.full_name,
            user_type: u.role.charAt(0) + u.role.slice(1).toLowerCase(), // e.g., TEACHER -> Teacher
            is_active: u.is_active ?? true
        }));
        
        res.json(mappedUsers);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.body.branch_id;
        const user = await UserService.createUser(schoolId, branchId, req.body);
        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await UserService.getUserById(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await UserService.updateUser(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getUserByEmail = async (req: AuthRequest, res: Response) => {
    try {
        const result = await UserService.getUserByEmail(req.user.school_id, req.params.email as string);
        if (!result) return res.status(404).json({ message: 'User not found' });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        await UserService.deleteUser(req.user.school_id, req.params.id as string);
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
