import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { FeeService } from '../services/fee.service';

export const createFee = async (req: AuthRequest, res: Response) => {
    try {
        const result = await FeeService.createFee(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllFees = async (req: AuthRequest, res: Response) => {
    try {
        const result = await FeeService.getAllFees(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getFeeById = async (req: AuthRequest, res: Response) => {
    try {
        const result = await FeeService.getFeeById(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFee = async (req: AuthRequest, res: Response) => {
    try {
        const result = await FeeService.updateFee(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFeeStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const result = await FeeService.updateFeeStatus(req.user.school_id, req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const deleteFee = async (req: AuthRequest, res: Response) => {
    try {
        await FeeService.deleteFee(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkFetchFees = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds, statusList } = req.body;
        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'studentIds array is required' });
        }
        const result = await FeeService.getFeesByStudentIds(req.user.school_id, studentIds, statusList);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
