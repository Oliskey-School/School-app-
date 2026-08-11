import { Router } from 'express';
import * as SaaSAnalyticsController from '../controllers/saas-analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
// Platform-wide business stats (every school's revenue, user counts, etc.) —
// only the Oliskey platform owner may see this, never a single school's own
// admin/proprietor, who would otherwise see every OTHER school's numbers too.
router.use(requireRole(['SUPER_ADMIN']));

router.get('/overview', SaaSAnalyticsController.getOverviewStats);
router.get('/charts', SaaSAnalyticsController.getChartsData);

export default router;
