import { Router } from 'express';
import { createAnonymousReport, createDiscreetRequest, getStudentReports } from '../controllers/studentReport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getStudentReports);
router.post('/anonymous', createAnonymousReport);
router.post('/discreet', createDiscreetRequest);

// Student report stats for TeacherReports screen
router.get('/:studentId/stats', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const studentId = req.params.studentId;

        const performance = await (prisma as any).academic_performance.findMany({
            where: { student_id: studentId },
            select: { subject: true, score: true }
        }).catch(() => []);

        const avgScore = performance.length > 0
            ? Math.round(performance.reduce((s: number, p: any) => s + (p.score || 0), 0) / performance.length)
            : 0;

        const totalAtt = await (prisma as any).student_attendance.count({
            where: { student_id: studentId }
        }).catch(() => 0);

        const presentAtt = await (prisma as any).student_attendance.count({
            where: { student_id: studentId, status: { in: ['Present', 'Late'] } }
        }).catch(() => 0);

        const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

        res.json({ avgScore, attendancePct, performance });
    } catch (e: any) { res.json({ avgScore: 0, attendancePct: 100, performance: [] }); }
});

export default router;
