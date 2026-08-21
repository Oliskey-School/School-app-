import { Router } from 'express';
import { createAnonymousReport, createDiscreetRequest, getStudentReports } from '../controllers/studentReport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

router.use(authenticate);
router.use(requireTenant);

// getStudentReports lists the same sensitive anonymous whistleblower/safety
// reports as GET /api/anonymous-reports (both read prisma.anonymousReport) —
// it had no role check at all, so any authenticated parent/student/teacher
// could list every report in the branch. Restrict to admin, matching the
// sibling endpoint's fix.
router.get('/', requireRole(ADMIN_ROLES), getStudentReports);
router.post('/anonymous', createAnonymousReport);
router.post('/discreet', createDiscreetRequest);

// Student report stats for TeacherReports screen
router.get('/:studentId/stats', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const studentId = req.params.studentId;

        // No ownership check existed here at all — any authenticated parent
        // or student could pull another family's child's average score,
        // attendance %, and per-subject performance just by knowing/guessing
        // a studentId. Same pattern as getAuthorizedStudentIds in
        // academic.controller.ts / attendance.controller.ts.
        const role = (req.user?.role || '').toLowerCase();
        const ADMIN_ROLES_LOWER = ['admin', 'proprietor', 'superadmin', 'super_admin'];
        if (!ADMIN_ROLES_LOWER.includes(role) && role !== 'teacher') {
            let allowed: string[] = [];
            if (role === 'student') {
                const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
                allowed = student ? [student.id] : [];
            } else if (role === 'parent') {
                const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
                if (parent) {
                    const links = await prisma.parentChild.findMany({ where: { parent_id: parent.id, deleted_at: null }, select: { student_id: true } });
                    allowed = links.map(l => l.student_id);
                }
            }
            if (!allowed.includes(studentId)) {
                return res.status(403).json({ message: "You do not have access to this student's report stats" });
            }
        }

        // Real model names are AcademicPerformance/Attendance (there is no
        // separate "student_attendance" model) — the old snake_case names
        // never existed on the client, so this always threw and the failure
        // was masked by a fallback that fabricated a 100% attendance rate.
        // Scope every query to the caller's school. The ownership gate above
        // only covers student/parent — teacher/admin short-circuit it, so with a
        // known studentId these queries would otherwise return ANOTHER school's
        // stats (student_id alone is globally unique but not tenant-scoped).
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(401).json({ message: 'Unauthorized' });

        const performance = await prisma.academicPerformance.findMany({
            where: { student_id: studentId, school_id: schoolId },
            select: { subject: true, score: true }
        });

        const avgScore = performance.length > 0
            ? Math.round(performance.reduce((s: number, p: any) => s + (p.score || 0), 0) / performance.length)
            : 0;

        const totalAtt = await prisma.attendance.count({
            where: { student_id: studentId, school_id: schoolId }
        });

        const presentAtt = await prisma.attendance.count({
            where: { student_id: studentId, school_id: schoolId, status: { in: ['Present', 'Late'] } }
        });

        const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

        res.json({ avgScore, attendancePct, performance });
    } catch (e: any) {
        // Never fabricate stats (an old bug here defaulted to attendancePct: 100
        // on failure — a real outage would have shown a perfect attendance
        // record that wasn't real). Fail loudly instead.
        console.error(`[GET /student-reports/:studentId/stats]`, e);
        res.status(500).json({ message: 'Failed to load student report stats' });
    }
});

export default router;
