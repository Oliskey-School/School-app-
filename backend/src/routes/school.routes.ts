import { Router } from 'express';
import { platformContext } from '../lib/tenantContext';
import * as SchoolController from '../controllers/school.controller';
import { schoolManifest, schoolIcon } from '../controllers/schoolBranding.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();
// Public / cross-school endpoints run in explicit platform scope (see
// lib/tenantContext.ts); per-route `authenticate` narrows to the tenant.
router.use(platformContext);

router.get('/public', SchoolController.listPublicSchools);
// PWA install branding — fetched by the browser without auth (see controller).
router.get('/:id/manifest.webmanifest', schoolManifest);
router.get('/:id/icon/:size', schoolIcon); // Express 5 path syntax (no inline regex); size is validated in the controller
router.post('/', SchoolController.createSchool); // Public registration
router.post('/onboard', SchoolController.onboardSchool);

// Pilot Onboarding Routes (must be before /:id)
router.get('/pilot-onboarding', authenticate, SchoolController.getPilotOnboarding);
router.put('/pilot-onboarding', authenticate, SchoolController.savePilotProgress);

router.get('/', authenticate, requireRole(['SUPER_ADMIN']), SchoolController.listSchools);
router.get('/:id', authenticate, SchoolController.getSchoolById);

// Bulk Operations (Must be put before /:id to not map 'bulk' to an ID param)
router.put('/bulk/status', authenticate, requireRole(['SUPER_ADMIN']), SchoolController.updateSchoolStatusBulk);
router.delete('/bulk', authenticate, requireRole(['SUPER_ADMIN']), SchoolController.deleteSchoolsBulk);

router.put('/', authenticate, SchoolController.updateMySchool);
// Deleting a school wipes its users, students, teachers, parents, classes and
// branches. `authenticate` alone let ANY role of that school (student, parent,
// teacher) through the controller's "is this your own school?" check, so the
// destructive action must be role-gated here as well.
router.delete('/:id', authenticate, requireRole(['SUPER_ADMIN', 'ADMIN', 'PROPRIETOR']), SchoolController.deleteSchool);
router.put('/:id', authenticate, SchoolController.updateSchool);
// Plan / status changes WITHOUT a verified payment are a platform-staff
// operation (support, comps, trial extensions). A school's own admin upgrades
// only through POST /api/subscription/activate, which verifies the Paystack
// transaction and the amount before touching plan_type.
router.post('/:id/subscription', authenticate, requireRole(['SUPER_ADMIN']), SchoolController.updateSchoolSubscription);

router.get('/:id/policies', authenticate, SchoolController.getSchoolPolicies);
router.get('/:id/photos', authenticate, SchoolController.getSchoolPhotos);

export default router;
