import { Router } from 'express';
import {
    getScholarships, createScholarship, updateScholarship, deleteScholarship,
    getScholarshipApplications, createScholarshipApplication, updateScholarshipApplication,
    getScholarshipRecipients, createScholarshipRecipient,
} from '../controllers/scholarship.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getScholarships);
router.post('/', createScholarship);
router.put('/:id', updateScholarship);
router.delete('/:id', deleteScholarship);

export default router;

// Named sub-routers used by index.ts for /scholarship-applications and /scholarship-recipients
export const applicationRouter = Router();
applicationRouter.use(authenticate);
applicationRouter.get('/', getScholarshipApplications);
applicationRouter.post('/', createScholarshipApplication);
applicationRouter.put('/:id', updateScholarshipApplication);

export const recipientRouter = Router();
recipientRouter.use(authenticate);
recipientRouter.get('/', getScholarshipRecipients);
recipientRouter.post('/', createScholarshipRecipient);
