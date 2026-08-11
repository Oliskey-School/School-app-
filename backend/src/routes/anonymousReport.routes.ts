import { Router } from 'express';
import {
    createAnonymousReport,
    getAnonymousReports,
    getReportByTrackCode,
    updateReportStatus
} from '../controllers/anonymousReport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

// These are anonymous whistleblower/safety reports (bullying, abuse, etc.) —
// the description, category and (non-anonymous) reporter_id are highly
// sensitive. The route comments below always said "Admin-only", but no role
// check was actually wired up: any authenticated user of ANY role (parent,
// student, teacher) could list every report in the school by simply calling
// this endpoint. Same class of leak as the report-cards/fee-transactions
// fixes from earlier rounds, just on a more sensitive dataset.
const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

// Public endpoint - no auth needed for anonymous reporting
router.post('/', createAnonymousReport);

// Public endpoint - track report by code (no auth, only returns limited info)
router.get('/track/:trackCode', getReportByTrackCode);

// Admin-only endpoints
router.get('/', authenticate, requireRole(ADMIN_ROLES), getAnonymousReports);
router.put('/:id/status', authenticate, requireRole(ADMIN_ROLES), updateReportStatus);

export default router;
