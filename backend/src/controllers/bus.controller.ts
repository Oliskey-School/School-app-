import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { BusService } from '../services/bus.service';

export const getBuses = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.query.branch_id;
        const buses = await BusService.getBuses(schoolId, branchId);
        res.json(buses);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.body.branch_id;
        const bus = await BusService.createBus(schoolId, branchId, req.body);
        res.status(201).json(bus);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.body.branch_id;
        const bus = await BusService.updateBus(schoolId, branchId, req.params.id as string, req.body);
        res.json(bus);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.body.branch_id;
        await BusService.deleteBus(schoolId, branchId, req.params.id as string);
        res.json({ message: 'Bus deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getStudentBus = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id as string;
        const studentId = req.params.studentId as string;
        const bus = await BusService.getStudentBus(schoolId, studentId);
        
        if (!bus) {
            return res.status(404).json({ message: 'No bus assignment found for this student.' });
        }
        
        res.json(bus);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
