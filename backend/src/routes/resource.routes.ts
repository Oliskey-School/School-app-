import { Router } from 'express';
import { createResource, getResources, deleteResource } from '../controllers/resource.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getResources);
router.post('/', createResource);
router.delete('/:id', deleteResource);

// PD Course Catalog
router.get('/courses', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const schoolId = req.user.school_id;
        const userId = req.user.id;
        // Get all published PD courses
        const courses = await (prisma as any).pd_course.findMany({
            where: { is_published: true },
            orderBy: { created_at: 'desc' }
        }).catch(() => []);
        // Get teacher's enrollments at once
        const teacher = await (prisma as any).teacher.findFirst({ where: { user_id: userId } }).catch(() => null);
        let enrolledCourseIds = new Set<number>();
        if (teacher) {
            const enrollments = await (prisma as any).teacher_course_enrollment.findMany({
                where: { teacher_id: teacher.id },
                select: { course_id: true }
            }).catch(() => []);
            enrolledCourseIds = new Set(enrollments.map((e: any) => e.course_id));
        }
        const result = courses.map((c: any) => ({ ...c, is_enrolled: enrolledCourseIds.has(c.id) }));
        res.json(result);
    } catch (e: any) { res.json([]); }
});

router.get('/courses/:id', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const course = await (prisma as any).pd_course.findUnique({
            where: { id: Number(req.params.id) },
            include: { modules: { orderBy: { order_index: 'asc' } } }
        }).catch(() => null);
        res.json(course || {});
    } catch (e: any) { res.json({}); }
});

router.post('/courses/:id/enroll', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const userId = req.user.id;
        const teacher = await (prisma as any).teacher.findFirst({ where: { user_id: userId } });
        if (!teacher) return res.status(400).json({ message: 'Teacher not found' });
        const result = await (prisma as any).teacher_course_enrollment.create({
            data: { teacher_id: teacher.id, course_id: Number(req.params.id), status: 'In Progress', enrolled_at: new Date() }
        });
        res.status(201).json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/courses/:id/progress', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const userId = req.user.id;
        const teacher = await (prisma as any).teacher.findFirst({ where: { user_id: userId } });
        if (!teacher) return res.status(400).json({ message: 'Teacher not found' });
        const enrollment = await (prisma as any).teacher_course_enrollment.findFirst({
            where: { teacher_id: teacher.id, course_id: Number(req.params.id) }
        });
        if (!enrollment) return res.status(400).json({ message: 'Enrollment not found' });
        const result = await (prisma as any).module_progress.upsert({
            where: { enrollment_id_module_id: { enrollment_id: enrollment.id, module_id: Number(req.body.lesson_id) } },
            create: { enrollment_id: enrollment.id, module_id: Number(req.body.lesson_id), is_completed: true, completed_at: new Date() },
            update: { is_completed: true, completed_at: new Date() }
        }).catch(async () => {
            return await (prisma as any).module_progress.create({
                data: { enrollment_id: enrollment.id, module_id: Number(req.body.lesson_id), is_completed: true, completed_at: new Date() }
            });
        });
        res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
