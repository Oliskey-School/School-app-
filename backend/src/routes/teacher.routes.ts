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
// Teacher-facing workload snapshot. Computed live from the same real
// class/duty/club assignment data the admin "view workload" screen uses
// (TeacherAssignmentService.getWorkload) — there is no persisted
// teacher_workload table populated anywhere in the app, so a previous
// version of this route queried a non-existent `prisma.teacher_workload`
// accessor (the real Prisma model is `TeacherWorkload`, client property
// `teacherWorkload`) which always threw and was silently swallowed into `{}`.
router.get('/:id/workload', authenticate, async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const teacher = await prisma.teacher.findFirst({
            where: { id: req.params.id, school_id: req.user.school_id },
            select: { id: true, branch_id: true },
        });
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        const { TeacherAssignmentService } = await import('../services/teacherAssignment.service');
        const list = await TeacherAssignmentService.getWorkload(req.user.school_id, teacher.branch_id || undefined);
        const entry = list.find((e: any) => e.teacher_id === teacher.id);
        if (!entry) return res.json({});

        const activeClasses = await (prisma as any).classTeacher.findMany({
            where: { teacher_id: teacher.id, school_id: req.user.school_id, status: 'active', deleted_at: null },
            select: { class_id: true, class: { select: { _count: { select: { enrollments: true } } } } },
        }).catch(() => []);
        const distinctClasses = new Map<string, number>();
        for (const c of activeClasses) distinctClasses.set(c.class_id, c.class?._count?.enrollments || 0);
        const numberOfClasses = distinctClasses.size;
        const avgClassSize = numberOfClasses
            ? Math.round((Array.from(distinctClasses.values()).reduce((s, n) => s + n, 0) / numberOfClasses) * 10) / 10
            : 0;

        // Normalize the raw score (periods + duty weight + club count) onto a
        // 0-100 scale for the UI's High/Moderate/Light bands. 40 periods/week
        // (a full teaching timetable plus duties) is treated as the "100" ceiling.
        const WORKLOAD_MAX = 40;
        const workloadScore = Math.min(100, Math.round((entry.workload_score / WORKLOAD_MAX) * 100));

        res.json({
            total_periods: entry.total_periods,
            total_hours: Math.round(entry.total_periods * 0.75 * 10) / 10,
            number_of_classes: numberOfClasses,
            avg_class_size: avgClassSize,
            workload_score: workloadScore,
        });
    } catch (e: any) {
        console.error('[GET /teachers/:id/workload]', e);
        res.json({});
    }
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
