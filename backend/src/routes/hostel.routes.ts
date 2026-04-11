import { Router } from 'express';
import { HostelService } from '../services/hostel.service';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', async (req: any, res) => {
    try {
        const hostels = await HostelService.getHostels(req.user.school_id, req.query.branchId);
        res.json(hostels);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', async (req: any, res) => {
    try {
        const hostel = await HostelService.createHostel(req.user.school_id, req.body.branch_id, req.body);
        res.status(201).json(hostel);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', async (req: any, res) => {
    try {
        await HostelService.deleteHostel(req.params.id);
        res.json({ message: 'Hostel deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/rooms', async (req: any, res) => {
    try {
        const rooms = await HostelService.getRooms(req.query.hostelId as string);
        res.json(rooms);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/rooms', async (req: any, res) => {
    try {
        const room = await HostelService.createRoom(req.body);
        res.status(201).json(room);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/rooms/:id', async (req: any, res) => {
    try {
        await HostelService.deleteRoom(req.params.id);
        res.json({ message: 'Room deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/allocations', async (req: any, res) => {
    try {
        const allocations = await HostelService.getAllocations(req.user.school_id);
        res.json(allocations);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/visitors', async (req: any, res) => {
    try {
        const logs = await HostelService.getVisitorLogs(req.user.school_id);
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/visitors', async (req: any, res) => {
    try {
        const log = await HostelService.createVisitorLog(req.body);
        res.status(201).json(log);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
