import { Router } from 'express';
import * as SaaSAnalyticsController from '../controllers/saas-analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['SUPER_ADMIN', 'PROPRIETOR', 'ADMIN']));

router.get('/overview', SaaSAnalyticsController.getOverviewStats);
router.get('/charts', SaaSAnalyticsController.getChartsData);

export default router;
