import { Router } from 'express';
import {
    getScholarships, createScholarship, updateScholarship, deleteScholarship,
    getScholarshipApplications, createScholarshipApplication, updateScholarshipApplication,
    getScholarshipRecipients, createScholarshipRecipient,
} from '../controllers/scholarship.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

const router = Router();

router.use(authenticate);

router.get('/', getScholarships);
router.post('/', requireRole(ADMIN_ROLES), createScholarship);
router.put('/:id', requireRole(ADMIN_ROLES), updateScholarship);
router.delete('/:id', requireRole(ADMIN_ROLES), deleteScholarship);

export default router;

// Named sub-routers used by index.ts for /scholarship-applications and /scholarship-recipients
export const applicationRouter = Router();
applicationRouter.use(authenticate);
applicationRouter.get('/', getScholarshipApplications);
// Any authenticated role may submit an application (parent/student applying on
// behalf of a child); reviewing/deciding an application is an admin action.
applicationRouter.post('/', createScholarshipApplication);
applicationRouter.put('/:id', requireRole(ADMIN_ROLES), updateScholarshipApplication);

export const recipientRouter = Router();
recipientRouter.use(authenticate);
recipientRouter.get('/', getScholarshipRecipients);
recipientRouter.post('/', requireRole(ADMIN_ROLES), createScholarshipRecipient);
