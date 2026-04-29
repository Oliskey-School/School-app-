import { Router } from 'express';
import * as VersionController from '../controllers/version.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Publicly available within the app context to show available versions
router.get('/', authenticate, VersionController.getVersions);

// Restrict setting version to school admins/proprietors
router.post('/school/:schoolId', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN', 'PROPRIETOR']), VersionController.setSchoolVersion);

// Internal/SuperAdmin: Register a new version
router.post('/register', authenticate, requireRole(['SUPER_ADMIN']), VersionController.registerVersion);

export default router;
