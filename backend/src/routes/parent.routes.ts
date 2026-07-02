import { Router } from 'express';
import { getParents, createParent, getParentById, updateParent, deleteParent, getMyChildren, getChildrenForParent, createAppointment, volunteerSignup, markNotificationRead, getParentsByClassId, getMyProfile, getChildOverview, getStudentFees, recordPayment, getPTAMeetings, getLearningResources, getParentMessages, sendMessage, getNotifications, getVolunteeringOpportunities, linkChild, unlinkChild, getComplaints, createComplaint, getParentTodayUpdate, getTeacherAvailability } from '../controllers/parent.controller';
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
router.post('/link-child', linkChild);
router.post('/link-child-unique', linkChild);
router.post('/unlink-child', unlinkChild);
router.post('/appointments', createAppointment);
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
        }).catch(() => []);
        res.json(signups);
    } catch (e: any) { res.json([]); }
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

router.get('/:id', getParentById);
router.put('/:id', updateParent);
router.delete('/:id', deleteParent);

export default router;

