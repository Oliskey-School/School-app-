import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TransactionService } from '../services/transaction.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { feeId } = req.query;
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await TransactionService.getTransactions(req.user.school_id, branchId, feeId as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'transaction.controller.ts');
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await TransactionService.createTransaction(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'transaction.controller.ts');
    }
};
export const verifyPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { reference } = req.params;
        const { gateway } = req.query; // 'paystack' or 'flutterwave'
        const branchId = getEffectiveBranchId(req.user);
        const result = await TransactionService.verifyPayment(req.user.school_id as string, branchId, reference as string, gateway as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'transaction.controller.ts');
    }
};
