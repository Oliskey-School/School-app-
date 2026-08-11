import { Router } from 'express';
import { TransportService } from '../services/transport.service';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';
import { getEffectiveBranchId } from '../utils/branchScope';

// Fleet management (creating/deleting routes, stops, and student assignments)
// is an admin-only operation — without this, any authenticated parent/student
// could delete the school's transport routes or reassign any student's bus.
const ADMIN_ONLY = requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']);

const router = Router();

// Validation errors (bad input the caller can fix) are safe to show verbatim.
// Anything else — a raw Prisma/DB exception — is logged server-side and
// replaced with a generic message so internal details never reach the client.
function sendWriteError(res: any, error: any, fallback: string) {
    if (error?.isValidation) {
        return res.status(400).json({ message: error.message });
    }
    console.error('[transport]', error);
    res.status(error?.statusCode || 500).json({ message: fallback });
}

router.use(authenticate, requireTenant);

// Root summary: returns all transport data in one response for overview screens
router.get('/', async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const [routes, stops, assignments] = await Promise.all([
            TransportService.getRoutes(req.user.school_id, branchId),
            TransportService.getStops(req.user.school_id, branchId),
            TransportService.getAssignments(req.user.school_id, branchId),
        ]);
        res.json({ routes, stops, assignments });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/routes', async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const routes = await TransportService.getRoutes(req.user.school_id, branchId);
        res.json(routes);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/routes', ADMIN_ONLY, async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const route = await TransportService.createRoute(req.user.school_id, branchId, req.body);
        res.status(201).json(route);
    } catch (error: any) {
        sendWriteError(res, error, 'Failed to create route');
    }
});

router.delete('/routes/:id', ADMIN_ONLY, async (req: any, res) => {
    try {
        await TransportService.deleteRoute(req.user.school_id, req.params.id);
        res.json({ message: 'Route deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.get('/stops', async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const stops = await TransportService.getStops(req.user.school_id, branchId, req.query.routeId as string);
        res.json(stops);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/stops', ADMIN_ONLY, async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const stop = await TransportService.createStop(req.user.school_id, branchId, req.body);
        res.status(201).json(stop);
    } catch (error: any) {
        sendWriteError(res, error, 'Failed to create stop');
    }
});

router.delete('/stops/:id', ADMIN_ONLY, async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        await TransportService.deleteStop(req.user.school_id, branchId, req.params.id);
        res.json({ message: 'Stop deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

// Lists every student's bus assignment across the branch — admin/teacher only.
// A parent must use GET /api/buses/student/:studentId (ownership-checked) for
// their own child's route instead of this school-wide list.
router.get('/assignments', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']), async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const assignments = await TransportService.getAssignments(req.user.school_id, branchId);
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/assignments', ADMIN_ONLY, async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const assignment = await TransportService.createAssignment(req.user.school_id, branchId, req.body);
        res.status(201).json(assignment);
    } catch (error: any) {
        sendWriteError(res, error, 'Failed to create assignment');
    }
});

router.delete('/assignments/:id', ADMIN_ONLY, async (req: any, res) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        await TransportService.deleteAssignment(req.user.school_id, branchId, req.params.id);
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

export default router;
