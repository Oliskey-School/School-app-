import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PayrollService } from '../services/payroll.service';

export const getPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        
        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required' });
        }

        const payslips = await PayrollService.getPayslips(req.user.school_id, teacherId);
            
        res.json(payslips || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSalaryArrears = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { branchId } = req.query;
        const arrears = await PayrollService.getSalaryArrears(schoolId, branchId as string);
        res.json(arrears);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSalaryArrearStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await PayrollService.updateSalaryArrearStatus(id, status);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        
        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required' });
        }

        const transactions = await PayrollService.getTransactions(req.user.school_id, teacherId);

        res.json(transactions || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const generatePayslip = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await PayrollService.savePayslip(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const approvePayslip = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await PayrollService.approvePayslip(req.user.school_id, id, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherSalary = async (req: AuthRequest, res: Response) => {
    try {
        const { teacherId } = req.params;
        const result = await PayrollService.getTeacherSalary(req.user.school_id, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSalaryProfile = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        if (!teacherId) return res.status(400).json({ message: 'Teacher ID required' });
        const result = await PayrollService.getTeacherSalary(req.user.school_id, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        if (!teacherId) return res.status(400).json({ message: 'Teacher ID required' });
        const transactions = await PayrollService.getTransactions(req.user.school_id, teacherId);
        res.json(transactions || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaveRequests = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = req.query.teacher_id as string || req.query.teacherId as string;
        const schoolId = req.user.school_id;
        const requests = await PayrollService.getLeaveRequests(schoolId, teacherId);
        res.json(requests || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitLeaveRequest = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = req.user.branch_id || req.body.branch_id || undefined;
        const teacherId = req.body.teacher_id || req.user.id;
        const result = await PayrollService.submitLeaveRequest(schoolId, branchId, teacherId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLeaveTypes = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const types = await PayrollService.getLeaveTypes(schoolId);
        res.json(types || []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
