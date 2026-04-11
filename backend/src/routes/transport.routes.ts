import { Router } from 'express';
import { TransportService } from '../services/transport.service';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/routes', async (req: any, res) => {
    try {
        const routes = await TransportService.getRoutes(req.user.school_id, req.query.branchId);
        res.json(routes);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/routes', async (req: any, res) => {
    try {
        const route = await TransportService.createRoute(req.user.school_id, req.body.branch_id, req.body);
        res.status(201).json(route);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/routes/:id', async (req: any, res) => {
    try {
        await TransportService.deleteRoute(req.params.id);
        res.json({ message: 'Route deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/stops', async (req: any, res) => {
    try {
        const stops = await TransportService.getStops(req.query.routeId as string);
        res.json(stops);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/stops', async (req: any, res) => {
    try {
        const stop = await TransportService.createStop(req.body);
        res.status(201).json(stop);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/stops/:id', async (req: any, res) => {
    try {
        await TransportService.deleteStop(req.params.id);
        res.json({ message: 'Stop deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/assignments', async (req: any, res) => {
    try {
        const assignments = await TransportService.getAssignments(req.user.school_id);
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/assignments', async (req: any, res) => {
    try {
        const assignment = await TransportService.createAssignment(req.body);
        res.status(201).json(assignment);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/assignments/:id', async (req: any, res) => {
    try {
        await TransportService.deleteAssignment(req.params.id);
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
