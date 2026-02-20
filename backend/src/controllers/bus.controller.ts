import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { BusService } from '../services/bus.service';

export const getBuses = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const buses = await BusService.getBuses(schoolId);
        res.json(buses);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const bus = await BusService.createBus(schoolId, req.body);
        res.status(201).json(bus);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const bus = await BusService.updateBus(schoolId, req.params.id as string, req.body);
        res.json(bus);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        await BusService.deleteBus(schoolId, req.params.id as string);
        res.json({ message: 'Bus deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
