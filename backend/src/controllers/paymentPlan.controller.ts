import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

export const createPaymentPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { fee_id, student_id, total_amount, installment_count, frequency, status } = req.body;
        
        const plan = await prisma.paymentPlan.create({
            data: {
                fee_id,
                student_id,
                total_amount,
                installment_count,
                frequency,
                status: status || 'active'
            }
        });
        
        res.status(201).json(plan);
    } catch (error: any) {
        console.error('Error creating payment plan:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createInstallments = async (req: AuthRequest, res: Response) => {
    try {
        const { installments } = req.body;
        
        const result = await prisma.installment.createMany({
            data: installments
        });
        
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating installments:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentPlanByFeeId = async (req: AuthRequest, res: Response) => {
    try {
        const { feeId } = req.params;
        
        const plan = await prisma.paymentPlan.findFirst({
            where: { fee_id: feeId }
        });
        
        if (!plan) {
            return res.json(null);
        }
        
        const installments = await prisma.installment.findMany({
            where: { payment_plan_id: plan.id },
            orderBy: { installment_number: 'asc' }
        });
        
        res.json({ plan, installments });
    } catch (error: any) {
        console.error('Error getting payment plan:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getUpcomingInstallments = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, daysAhead } = req.query;
        if (!studentId) return res.status(400).json({ message: 'studentId required' });
        
        const days = parseInt(daysAhead as string) || 7;
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);
        
        const installments = await prisma.installment.findMany({
            where: {
                payment_plan: {
                    student_id: studentId as string
                },
                status: { in: ['pending', 'partial'] },
                due_date: {
                    gte: today,
                    lte: futureDate
                }
            },
            include: {
                payment_plan: true
            },
            orderBy: { due_date: 'asc' }
        });
        
        res.json(installments);
    } catch (error: any) {
        console.error('Error getting upcoming installments:', error);
        res.status(500).json({ message: error.message });
    }
};

export const updatePaymentPlanStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const updated = await prisma.paymentPlan.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        
        res.json(updated);
    } catch (error: any) {
        console.error('Error updating payment plan status:', error);
        res.status(500).json({ message: error.message });
    }
};

export const processInstallmentPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, transactionId } = req.body;
        
        const installment = await prisma.installment.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!installment) {
            return res.status(404).json({ message: 'Installment not found' });
        }
        
        const newPaidAmount = (installment.paid_amount || 0) + parseFloat(amount);
        
        const updated = await prisma.installment.update({
            where: { id: parseInt(id) },
            data: {
                paid_amount: newPaidAmount,
                transaction_id: transactionId ? parseInt(transactionId) : null
            }
        });
        
        res.json(updated);
    } catch (error: any) {
        console.error('Error processing installment payment:', error);
        res.status(500).json({ message: error.message });
    }
};

export const deletePaymentPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        await prisma.paymentPlan.delete({
            where: { id: parseInt(id) }
        });
        
        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting payment plan:', error);
        res.status(500).json({ message: error.message });
    }
};
