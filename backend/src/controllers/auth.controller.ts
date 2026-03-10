import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const { user, token } = await AuthService.login(email, password);
        res.json({ token, user });
    } catch (error: any) {
        res.status(401).json({ message: error.message });
    }
};

export const signup = async (req: Request, res: Response) => {
    try {
        const user = await AuthService.signup(req.body);
        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const user = await AuthService.createUser(req.body);
        res.status(201).json(user);
    } catch (error: any) {
        console.error('Create User Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const resendVerification = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const result = await AuthService.resendVerification(email);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const confirmEmail = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const result = await AuthService.confirmEmail(userId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateEmail = async (req: Request, res: Response) => {
    try {
        const { userId, newEmail } = req.body;
        const result = await AuthService.updateEmail(userId, newEmail);
        res.json(result);
    } catch (error: any) {
        console.error('[AuthController] Update Email Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const updateUsername = async (req: Request, res: Response) => {
    try {
        const { userId, newUsername } = req.body;
        const result = await AuthService.updateUsername(userId, newUsername);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updatePassword = async (req: Request, res: Response) => {
    try {
        const { userId, newPassword } = req.body;
        const result = await AuthService.updatePassword(userId, newPassword);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMemberships = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) throw new Error('userId is required');
        const memberships = await AuthService.getMemberships(userId as string);
        res.json(memberships);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const switchSchool = async (req: Request, res: Response) => {
    try {
        const { userId, schoolId } = req.body;
        if (!userId || !schoolId) throw new Error('userId and schoolId are required');
        const result = await AuthService.switchSchool(userId, schoolId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
