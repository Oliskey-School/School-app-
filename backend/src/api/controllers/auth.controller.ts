
import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const result = await AuthService.loginUser(username, password);
        if (!result) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getMe = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.id;
    try {
        const user = await AuthService.getUserProfile(userId);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
}
