import { Router } from 'express';
import * as SchoolController from '../controllers/school.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Only Super Admins can list or create schools via this API (or open signup)
// For now, let's allow public creation for "Sign up your school" flow if needed,
// but usually that's a separate auth flow.
// Based on instructions, we'll protect list, maybe open create.

router.post('/', SchoolController.createSchool); // Public registration
router.get('/', authenticate, requireRole(['SuperAdmin']), SchoolController.listSchools);
router.get('/:id', authenticate, SchoolController.getSchoolById);

// Bulk Operations (Must be put before /:id to not map 'bulk' to an ID param)
router.put('/bulk/status', authenticate, requireRole(['SuperAdmin']), SchoolController.updateSchoolStatusBulk);
router.delete('/bulk', authenticate, requireRole(['SuperAdmin']), SchoolController.deleteSchoolsBulk);

router.put('/:id', authenticate, SchoolController.updateSchool);

export default router;
