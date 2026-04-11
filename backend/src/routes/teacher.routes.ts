import { Router } from 'express';
import { createTeacher, getAllTeachers, getTeacherById, updateTeacher, deleteTeacher, submitMyAttendance, getMyHistory, getTeacherAttendance, getMyProfile, saveTeacherAttendance, approveTeacherAttendance, getMyStudentsWithCredentials, getPendingStudents, getMyAppointments, updateMyAppointmentStatus, getMyBadges, getMyRecognitions, getMyMentoring, createMyMentoring, getTeacherCertificates, getSubstituteRequests, createSubstituteRequest } from '../controllers/teacher.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlanCapacity } from '../middleware/plan.middleware';

const router = Router();

router.get('/me', authenticate, getMyProfile);
router.get('/me/appointments', authenticate, getMyAppointments);
router.put('/appointments/:id/status', authenticate, updateMyAppointmentStatus);
router.get('/attendance', authenticate, getTeacherAttendance);
router.post('/attendance', authenticate, saveTeacherAttendance);
router.put('/attendance/:id/approve', authenticate, approveTeacherAttendance);
router.post('/me/attendance', authenticate, submitMyAttendance);
router.get('/me/attendance', authenticate, getMyHistory);
router.get('/me/students', authenticate, getMyStudentsWithCredentials);
router.get('/pending-students', authenticate, getPendingStudents);

// PD / Engagement "me" routes — inline handlers using prisma
router.get('/me/badges', authenticate, getMyBadges);
router.get('/me/recognitions', authenticate, getMyRecognitions);
router.get('/me/mentoring', authenticate, getMyMentoring);
router.post('/me/mentoring', authenticate, createMyMentoring);
router.get('/me/substitutes', authenticate, getSubstituteRequests);
router.post('/me/substitutes', authenticate, createSubstituteRequest);
router.get('/me/pd-courses', authenticate, async (req: any, res) => {
    // This one is still specific to PD enrollments, maybe move to PDService later
    try {
        const { default: prisma } = await import('../config/database');
        const userId = req.user.id;
        const teacher = await (prisma as any).teacher.findFirst({ where: { user_id: userId } });
        if (!teacher) return res.json([]);
        const enrollments = await (prisma as any).pdEnrollment.findMany({
            where: { teacher_id: teacher.id }, orderBy: { enrolled_at: 'desc' },
            include: { pd_course: true }
        }).catch(() => []);
        res.json(enrollments);
    } catch (e: any) { res.json([]); }
});

router.get('/substitutes', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const teachers = await (prisma as any).teacher.findMany({
            where: { school_id: req.user.school_id },
            select: { id: true, full_name: true, email: true, subject: true }
        }).catch(() => []);
        res.json(teachers);
    } catch (e: any) { res.json([]); }
});

router.get('/substitutes/requests', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const teacherId = req.query.teacherId as string;
        const requests = await (prisma as any).substitute_assignment.findMany({
            where: { substitute_teacher_id: teacherId },
            orderBy: { date: 'asc' }
        }).catch(() => []);
        res.json(requests);
    } catch (e: any) { res.json([]); }
});

router.post('/substitutes/requests', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const result = await (prisma as any).substitute_assignment.create({ data: { ...req.body, school_id: req.user.school_id } });
        res.status(201).json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/appointments/:id', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const result = await (prisma as any).appointment.findUnique({ where: { id: req.params.id } });
        res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/appointments/:id', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const result = await (prisma as any).appointment.update({ where: { id: req.params.id }, data: req.body });
        res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/appointments', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const result = await (prisma as any).appointment.create({ data: { ...req.body, school_id: req.user.school_id } });
        res.status(201).json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/', authenticate, requirePlanCapacity('teacher'), createTeacher);
router.get('/', authenticate, getAllTeachers);
router.get('/:id/salary-profile', authenticate, async (req: any, res) => {
    const { PayrollService } = await import('../services/payroll.service');
    const profile = await PayrollService.getSalaryProfile(req.user.school_id, req.params.id);
    res.json(profile);
});
router.get('/:id/payslips', authenticate, async (req: any, res) => {
    const { PayrollService } = await import('../services/payroll.service');
    const payslips = await PayrollService.getPayslips(req.user.school_id, req.params.id);
    res.json(payslips);
});
router.get('/:id/workload', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const data = await (prisma as any).teacher_workload.findFirst({
            where: { teacher_id: req.params.id }, orderBy: { week_start_date: 'desc' }
        }).catch(() => null);
        res.json(data || {});
    } catch (e: any) { res.json({}); }
});
router.get('/:id/certificates', authenticate, getTeacherCertificates);
router.get('/:id/appointments', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const data = await (prisma as any).appointment.findMany({
            where: { teacher_id: req.params.id }, orderBy: { date: 'asc' }
        }).catch(() => []);
        res.json(data);
    } catch (e: any) { res.json([]); }
});
router.get('/:id', authenticate, getTeacherById);
router.put('/:id', authenticate, updateTeacher);
router.delete('/:id', authenticate, deleteTeacher);

export default router;
