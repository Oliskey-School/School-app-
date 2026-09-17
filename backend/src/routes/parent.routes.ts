import { Router } from 'express';
import { getParents, createParent, getParentById, updateParent, deleteParent, getMyChildren, getChildrenForParent, createAppointment, getMyAppointments, volunteerSignup, markNotificationRead, getParentsByClassId, getMyProfile, getChildOverview, getStudentFees, recordPayment, getPTAMeetings, getLearningResources, getParentMessages, sendMessage, getNotifications, getVolunteeringOpportunities, linkChild, unlinkChild, getComplaints, createComplaint, getParentTodayUpdate, getTeacherAvailability } from '../controllers/parent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/me', getMyProfile);
router.get('/me/children', getMyChildren);
router.get('/class/:classId', getParentsByClassId);
router.get('/by-class/:classId', getParentsByClassId);
router.get('/:id/children', getChildrenForParent);
router.get('/', getParents);
router.post('/', createParent);
router.post('/link-child', linkChild);
router.post('/unlink-child', unlinkChild);
router.post('/appointments', createAppointment);
router.get('/me/appointments', getMyAppointments);
router.post('/volunteer-signup', volunteerSignup);
router.get('/me/children/:studentId/overview', getChildOverview);
router.get('/me/children/:studentId/fees', getStudentFees);
router.post('/me/payments', recordPayment);
router.put('/notifications/:id/read', markNotificationRead);

// Phase 2 Supplementary Routes
router.post('/pta-meetings/register', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const { meetingId } = req.body;
        if (!meetingId) return res.status(400).json({ error: 'meetingId is required' });
        const parent = await (prisma as any).parent.findFirst({ where: { user_id: req.user?.id } }).catch(() => null);
        if (!parent) return res.status(400).json({ error: 'Parent not found' });
        const existing = await (prisma as any).ptaMeetingAttendee.findFirst({
            where: { meeting_id: meetingId, parent_id: parent.id }
        }).catch(() => null);
        if (existing) return res.json({ registered: true, message: 'Already registered' });
        await (prisma as any).ptaMeetingAttendee.create({
            data: { meeting_id: meetingId, parent_id: parent.id, school_id: req.user.school_id }
        });
        res.status(201).json({ registered: true, message: 'Registration successful' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/pta-meetings', getPTAMeetings);
router.get('/pta/meetings', getPTAMeetings); // Frontend compatibility
// When parentRoutes is mounted at '/pta', the frontend's GET /api/pta/meetings
// arrives here as '/meetings'. Without this it falls through to '/:id' and is
// mis-read as a parent lookup ("Parent not found" → 500).
router.get('/meetings', getPTAMeetings);
router.get('/learning-resources', getLearningResources);
router.get('/messages', getParentMessages);
router.post('/messages', sendMessage);
router.get('/notifications', getNotifications);
router.get('/volunteering-opportunities', getVolunteeringOpportunities);
router.get('/me/volunteer-signups', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const parent = await (prisma as any).parent.findFirst({ where: { user_id: req.user?.id } }).catch(() => null);
        if (!parent) return res.json([]);
        const signups = await (prisma as any).volunteerSignup.findMany({
            where: { parent_id: parent.id },
            include: { opportunity: true },
            orderBy: { created_at: 'desc' },
        });
        res.json(signups);
    } catch (e: any) {
        console.error('[GET /parents/me/volunteer-signups]', e);
        res.status(500).json({ message: 'Failed to load volunteer signups' });
    }
});
router.get('/volunteering/opportunities', getVolunteeringOpportunities); // Frontend compatibility
router.post('/volunteering/signups', volunteerSignup); // Frontend compatibility
router.post('/volunteer/signups', volunteerSignup); // Alternate spelling

// Savings Piggy Bank Routes
import { getParentPlans, createPlan, addFunds } from '../controllers/savings.controller';
router.get('/savings/plans', getParentPlans);
router.post('/savings/plans', createPlan);
router.post('/savings/plans/deposit', addFunds);

router.get('/me/today-update', getParentTodayUpdate);
router.get('/:parentId/today-update', getParentTodayUpdate); // External support
router.get('/complaints', getComplaints);
router.post('/complaints', createComplaint);
router.get('/teachers/:teacherId/availability', getTeacherAvailability);

// This catch-all sits after every named route above, but Express still
// matches it against any path segment that reaches this point unmatched —
// a typo'd or removed route (e.g. a stale frontend build hitting an old
// path) silently falls through here and gets treated as a parent lookup,
// returning a confusing "Parent not found" instead of a real 404. Reject
// anything that isn't actually shaped like a Parent id (a UUID) before it
// reaches the controller.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router.param('id', (req, res, next, id) => {
    if (!UUID_RE.test(id)) {
        return res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
    }
    next();
});

router.get('/:id', getParentById);
router.put('/:id', updateParent);
router.delete('/:id', deleteParent);

export default router;

