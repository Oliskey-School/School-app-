import { Router } from 'express';
import {
    getResources, createResource, updateResource, deleteResource,
    upsertMyProgress, getMyProgress, getStudentProgress,
    getMySummary, getStudentSummary,
    createStudyPlan, getStudyPlans,
} from '../controllers/learningHub.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/resources', getResources);
router.post('/resources', createResource);
router.put('/resources/:id', updateResource);
router.delete('/resources/:id', deleteResource);

router.get('/progress/me', getMyProgress);
router.post('/progress/me', upsertMyProgress);
router.get('/progress/summary/me', getMySummary);
router.get('/progress/student/:studentId', getStudentProgress);
router.get('/progress/summary/:studentId', getStudentSummary);

router.post('/study-plans', createStudyPlan);
// A STUDENT caller's own studentId param is ignored by the controller (self-resolved
// from the JWT), so '/study-plans/me' and '/study-plans/:realId' both work for them.
router.get('/study-plans/:studentId', getStudyPlans);

export default router;
