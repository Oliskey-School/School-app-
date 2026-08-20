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

// Submitting requires a session so the report can be filed against the right
// school — the row's school_id is NOT NULL, and without a token there was no
// way to derive it, so every submission failed with a 500 and nothing was ever
// saved. The report stays anonymous: only school_id/branch_id are taken from
// the token, never the reporter's identity.
router.post('/', authenticate, createAnonymousReport);

// Public endpoint - track report by code (no auth, only returns limited info)
router.get('/track/:trackCode', getReportByTrackCode);

// Admin-only endpoints
router.get('/', authenticate, requireRole(ADMIN_ROLES), getAnonymousReports);
router.put('/:id/status', authenticate, requireRole(ADMIN_ROLES), updateReportStatus);

export default router;
