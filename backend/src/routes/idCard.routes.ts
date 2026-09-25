import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';
import { exportLimiter } from '../middleware/rateLimiters';
import {
    getIDCardStats,
    getIDCards,
    issueIDCard,
    getIDCardByStudent
} from '../controllers/idCard.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', getIDCardStats);
router.get('/', getIDCards);
router.get('/student/:studentId', getIDCardByStudent);
router.post('/issue/:studentId', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), exportLimiter, issueIDCard);

export default router;
