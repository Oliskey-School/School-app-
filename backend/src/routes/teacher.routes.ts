import { Router } from 'express';
import { createTeacher, getAllTeachers, getTeacherById, updateTeacher, deleteTeacher, submitMyAttendance, getMyHistory, getTeacherAttendance, getMyProfile, saveTeacherAttendance, approveTeacherAttendance, getMyStudentsWithCredentials, getPendingStudents, getMyAppointments, updateMyAppointmentStatus, getMyBadges, getMyRecognitions, getMyMentoring, createMyMentoring, getTeacherCertificates, getSubstituteRequests, createSubstituteRequest, getTeacherEvaluation, submitTeacherEvaluation, getTeacherPerformance, assignTeacherBranchClasses } from '../controllers/teacher.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlanCapacity } from '../middleware/plan.middleware';

const router = Router();

router.get('/me', authenticate, getMyProfile);
router.get('/me/appointments', authenticate, getMyAppointments);
router.put('/appointments/:id/status', authenticate, updateMyAppointmentStatus);
router.get('/attendance', authenticate, getTeacherAttendance);
router.get('/attendance-approvals', authenticate, getTeacherAttendance);
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

router.post('/', authenticate, requirePlanCapacity('teacher'), createTeacher);
router.get('/', authenticate, getAllTeachers);
router.get('/:id/salary-profile', authenticate, async (req: any, res) => {
    try {
        const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
        const isAdmin = ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
        if (!isAdmin) {
            const { default: prisma } = await import('../config/database');
            const own = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!own || own.id !== req.params.id) {
                return res.status(403).json({ message: 'You do not have access to this teacher\'s salary profile' });
            }
        }
        const { PayrollService } = await import('../services/payroll.service');
        const profile = await PayrollService.getTeacherSalary(req.user.school_id, req.params.id);
        res.json(profile);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/:id/badges', authenticate, async (req: any, res) => {
    const { default: prisma } = await import('../config/database');
    const { TeacherService } = await import('../services/teacher.service');
    const teacher = await (prisma as any).teacher.findFirst({
        where: { id: req.params.id, school_id: req.user.school_id },
        select: { user_id: true }
    });

    if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
    }

    const badges = await TeacherService.getTeacherBadges(teacher.user_id);
    res.json(badges);
});
router.get('/:id/workload', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const data = await (prisma as any).teacher_workload.findFirst({
            where: { teacher_id: req.params.id, school_id: req.user.school_id }, orderBy: { week_start_date: 'desc' }
        }).catch(() => null);
        res.json(data || {});
    } catch (e: any) { res.json({}); }
});
router.get('/:id/certificates', authenticate, getTeacherCertificates);
router.get('/:id', authenticate, getTeacherById);
router.put('/:id', authenticate, updateTeacher);
// Branch admin assigns a lent teacher to classes/subjects in THEIR branch only.
router.put('/:id/branch-classes', authenticate, assignTeacherBranchClasses);
router.get('/:id/evaluation', authenticate, getTeacherEvaluation);
router.post('/:id/evaluation', authenticate, submitTeacherEvaluation);
router.get('/:id/performance', authenticate, getTeacherPerformance);
router.delete('/:id', authenticate, deleteTeacher);

export default router;
