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

router.get('/:id/related', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const schoolId = req.user.school_id;
        const source = await (prisma as any).resource.findFirst({
            where: { id: req.params.id, school_id: schoolId }
        }).catch(() => null);
        const related = await (prisma as any).resource.findMany({
            where: {
                school_id: schoolId,
                id: { not: req.params.id },
                ...(source?.subject ? { subject: source.subject } : {}),
            },
            orderBy: { created_at: 'desc' },
            take: 6,
        });
        res.json(related);
    } catch (e: any) {
        // "Related resources" is a secondary widget on the resource detail
        // page — an empty list here is a reasonable degrade, but the failure
        // still needs to be visible somewhere, so log it instead of staying silent.
        console.error('[GET /resources/:id/related]', e);
        res.json([]);
    }
});

// PD Course Catalog. Previously queried prisma.pd_course (doesn't exist —
// the real model is PDCourse) filtered by an is_published field that
// doesn't exist on it either, and prisma.teacher_course_enrollment (the
// real model is PDEnrollment) — every request threw and was silently
// caught into an empty catalog. Also never scoped courses by school_id,
// so it would have leaked every school's PD courses together even once the
// naming was fixed. enrolledCourseIds was typed Set<number> against string
// UUIDs too, so is_enrolled could never have been true even by accident.
router.get('/courses', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const schoolId = req.user.school_id;
        const userId = req.user.id;
        const courses = await prisma.pDCourse.findMany({
            where: { school_id: schoolId, deleted_at: null },
            orderBy: { created_at: 'desc' }
        });
        // Get teacher's enrollments at once — secondary annotation on the
        // catalog (which courses are already enrolled); a failure here just
        // means is_enrolled defaults to false, the catalog itself still loads.
        const teacher = await prisma.teacher.findFirst({ where: { user_id: userId } }).catch(() => null);
        const enrolledCourseIds = new Set<string>();
        if (teacher) {
            const enrollments = await prisma.pDEnrollment.findMany({
                where: { teacher_id: teacher.id },
                select: { course_id: true }
            }).catch(() => []);
            enrollments.forEach((e) => enrolledCourseIds.add(e.course_id));
        }
        const result = courses.map((c) => ({ ...c, is_enrolled: enrolledCourseIds.has(c.id) }));
        res.json(result);
    } catch (e: any) {
        console.error('[GET /resources/courses]', e);
        res.status(500).json({ message: 'Failed to load PD course catalog' });
    }
});

// GET /courses/:id, POST /courses/:id/enroll and POST /courses/:id/progress
// used to live here, referencing prisma.pd_course / teacher_course_enrollment
// / module_progress and treating course ids as autoincrement ints via
// Number(req.params.id) — none of those models exist anywhere in the schema
// (PDCourse.id is a uuid string) and nothing in the frontend ever called
// these paths (confirmed via lib/api.ts, which only calls /pd/courses/...).
// The real, working, tested implementation is pd.routes.ts + pd.controller.ts
// (see its own comment: "The teacher CourseCatalog UI posts to
// /pd/courses/:id/enroll and /pd/courses/:id/progress"). Removed rather than
// invented a fake modules/module_progress feature to make dead code compile.

export default router;
