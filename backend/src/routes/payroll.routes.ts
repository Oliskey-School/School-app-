import { Router } from 'express';
import { getPayslips, getTransactions, generatePayslip, approvePayslip, getTeacherSalary, getSalaryArrears, updateSalaryArrearStatus, getLeaveRequests, submitLeaveRequest, getSalaryProfile, getPaymentHistory, getLeaveTypes } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/payslips', getPayslips);
router.get('/transactions', getTransactions);
router.post('/generate-payslip', generatePayslip);
router.put('/approve/:id', approvePayslip);
router.get('/salary/:teacherId', getTeacherSalary);
router.get('/salary-profile', getSalaryProfile);
router.get('/payment-history', getPaymentHistory);
router.get('/leave-requests', getLeaveRequests);
router.post('/leave-requests', submitLeaveRequest);
router.get('/leave-types', getLeaveTypes);
router.get('/arrears', getSalaryArrears);
router.put('/arrears/:id', updateSalaryArrearStatus);

export default router;
