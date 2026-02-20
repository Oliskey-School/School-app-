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
