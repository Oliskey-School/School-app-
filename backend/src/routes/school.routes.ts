import { Router } from 'express';
import * as SchoolController from '../controllers/school.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.get('/public', SchoolController.listSchools);
router.post('/', SchoolController.createSchool); // Public registration
router.post('/onboard', SchoolController.onboardSchool);

// Pilot Onboarding Routes (must be before /:id)
router.get('/pilot-onboarding', authenticate, SchoolController.getPilotOnboarding);
router.put('/pilot-onboarding', authenticate, SchoolController.savePilotProgress);

router.get('/', authenticate, requireRole(['SuperAdmin']), SchoolController.listSchools);
router.get('/:id', authenticate, SchoolController.getSchoolById);

// Bulk Operations (Must be put before /:id to not map 'bulk' to an ID param)
router.put('/bulk/status', authenticate, requireRole(['SuperAdmin']), SchoolController.updateSchoolStatusBulk);
router.delete('/bulk', authenticate, requireRole(['SuperAdmin']), SchoolController.deleteSchoolsBulk);

router.put('/:id', authenticate, SchoolController.updateSchool);

export default router;
