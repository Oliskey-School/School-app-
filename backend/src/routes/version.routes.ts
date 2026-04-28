import { Router } from 'express';
import * as VersionController from '../controllers/version.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Publicly available within the app context to show available versions
router.get('/', authenticate, VersionController.getVersions);

// Restrict setting version to school admins/proprietors (simplified auth for now)
router.post('/school/:schoolId', authenticate, VersionController.setSchoolVersion);

// Internal/SuperAdmin: Register a new version
router.post('/register', authenticate, VersionController.registerVersion);

export default router;
