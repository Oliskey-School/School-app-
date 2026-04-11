import { Router } from 'express';
import {
    createAnonymousReport,
    getAnonymousReports,
    getReportByTrackCode,
    updateReportStatus
} from '../controllers/anonymousReport.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public endpoint - no auth needed for anonymous reporting
router.post('/', createAnonymousReport);

// Public endpoint - track report by code (no auth, only returns limited info)
router.get('/track/:trackCode', getReportByTrackCode);

// Admin-only endpoints
router.get('/', authenticate, getAnonymousReports);
router.put('/:id/status', authenticate, updateReportStatus);

export default router;
