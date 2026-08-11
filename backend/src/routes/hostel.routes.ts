import { Router } from 'express';
import { HostelService } from '../services/hostel.service';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

// Hostel/room/allocation/visitor-log management is admin-only in the
// frontend (components/admin/HostelManagementScreen.tsx is the sole
// caller) — but every write endpoint here had zero role check, so any
// authenticated user (a student, a parent) could create/edit/delete
// hostels, rooms, allocations, and visitor logs. Verified live via demo
// student token (blocked only by a missing required field, not by auth).
const HOSTEL_ADMIN = requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']);

router.get('/', async (req: any, res) => {
    try {
        const hostels = await HostelService.getHostels(req.user.school_id, req.query.branchId);
        res.json(hostels);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
});

router.post('/', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        const hostel = await HostelService.createHostel(req.user.school_id, req.body.branch_id, req.body);
        res.status(201).json(hostel);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.put('/:id', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        const hostel = await HostelService.updateHostel(req.user.school_id, req.params.id, req.body);
        res.json(hostel);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.delete('/:id', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        await HostelService.deleteHostel(req.user.school_id, req.params.id);
        res.json({ message: 'Hostel deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.get('/rooms', async (req: any, res) => {
    try {
        const rooms = await HostelService.getRooms(req.query.hostelId as string);
        res.json(rooms);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
});

router.post('/rooms', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        const room = await HostelService.createRoom(req.user.school_id, req.body);
        res.status(201).json(room);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.delete('/rooms/:id', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        await HostelService.deleteRoom(req.user.school_id, req.params.id);
        res.json({ message: 'Room deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.get('/allocations', async (req: any, res) => {
    try {
        const allocations = await HostelService.getAllocations(req.user.school_id);
        res.json(allocations);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
});

router.post('/allocations', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        const allocation = await HostelService.createAllocation(req.user.school_id, req.body);
        res.status(201).json(allocation);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.delete('/allocations/:id', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        await HostelService.deleteAllocation(req.user.school_id, req.params.id);
        res.json({ message: 'Allocation deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.get('/visitors', async (req: any, res) => {
    try {
        const logs = await HostelService.getVisitorLogs(req.user.school_id);
        res.json(logs);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
});

router.post('/visitors', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        const log = await HostelService.createVisitorLog(req.user.school_id, req.body);
        res.status(201).json(log);
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

router.delete('/visitors/:id', HOSTEL_ADMIN, async (req: any, res) => {
    try {
        await HostelService.deleteVisitorLog(req.user.school_id, req.params.id);
        res.json({ message: 'Visitor log deleted successfully' });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
});

export default router;
