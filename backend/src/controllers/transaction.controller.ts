import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TransactionService } from '../services/transaction.service';

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { feeId } = req.query;
        const result = await TransactionService.getTransactions(req.user.school_id, feeId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TransactionService.createTransaction(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
