import { Request, Response } from 'express';
import { VirtualClassService } from '../services/virtual-class.service';

export const createVirtualClassSession = async (req: Request, res: Response) => {
    try {
        const sessionData = req.body;
        const session = await VirtualClassService.createSession(sessionData);
        res.status(201).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
