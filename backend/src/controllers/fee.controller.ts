import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { FeeService } from '../services/fee.service';

export const createFee = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await FeeService.createFee(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllFees = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.query.branch_id;
        const result = await FeeService.getAllFees(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getFeeById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.query.branch_id;
        const result = await FeeService.getFeeById(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFee = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await FeeService.updateFee(req.user.school_id, branchId, req.params.id as string, req.body);
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
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await FeeService.updateFeeStatus(req.user.school_id, branchId, req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const deleteFee = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        await FeeService.deleteFee(req.user.school_id, branchId, req.params.id as string);
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
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await FeeService.getFeesByStudentIds(req.user.school_id, branchId, studentIds as string[], statusList as string[]);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getFinancialAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const { periodType, startDate, endDate } = req.query;
        if (!periodType || !startDate || !endDate) {
            return res.status(400).json({ message: 'periodType, startDate, and endDate are required' });
        }
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await FeeService.getFinancialAnalytics(
            req.user.school_id,
            branchId,
            periodType as string,
            startDate as string,
            endDate as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const recordPayment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branchId;
        const result = await FeeService.recordPayment(req.user.school_id, branchId, req.body);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const { studentId } = req.query;
        const result = await FeeService.getPaymentHistory(req.user.school_id, branchId, studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
        await FeeService.deletePayment(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await FeeService.getBudgets(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branchId;
        const result = await FeeService.createBudget(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getArrears = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await FeeService.getArrears(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateArrear = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const result = await FeeService.updateArrearStatus(req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await FeeService.getTransactions(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
