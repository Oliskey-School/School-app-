import { Router } from 'express';
import { getParents, createParent, getParentById, updateParent, deleteParent, getMyChildren, getChildrenForParent, createAppointment, volunteerSignup, markNotificationRead, getParentsByClassId, getMyProfile, getChildOverview, getStudentFees, recordPayment, getPTAMeetings, getLearningResources, getParentMessages, sendMessage, getNotifications, getVolunteeringOpportunities, linkChild, unlinkChild } from '../controllers/parent.controller';
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
router.get('/pta-meetings', getPTAMeetings);
router.get('/pta/meetings', getPTAMeetings); // Frontend compatibility
router.get('/learning-resources', getLearningResources);
router.get('/messages', getParentMessages);
router.post('/messages', sendMessage);
router.get('/notifications', getNotifications);
router.get('/volunteering-opportunities', getVolunteeringOpportunities);
router.get('/volunteering/opportunities', getVolunteeringOpportunities); // Frontend compatibility
router.post('/volunteering/signups', volunteerSignup); // Frontend compatibility
router.post('/volunteer/signups', volunteerSignup); // Alternate spelling

// Savings Piggy Bank Routes
import { getParentPlans, createPlan, addFunds } from '../controllers/savings.controller';
router.get('/savings/plans', getParentPlans);
router.post('/savings/plans', createPlan);
router.post('/savings/plans/deposit', addFunds);

router.get('/:id', getParentById);
router.put('/:id', updateParent);
router.delete('/:id', deleteParent);

export default router;

