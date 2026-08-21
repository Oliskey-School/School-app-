import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';
import {
    getCurrentTermController,
    getQuoteController,
    activateSubscriptionController,
    listCalendarController,
    topUpController,
    purchaseUserAiController,
    listAllSubscriptionsController,
    updateSubscriptionController,
} from '../controllers/subscription.controller';

const router = Router();

router.get('/current-term', getCurrentTermController);
router.get('/quote', getQuoteController);
router.post('/activate', activateSubscriptionController);
router.post('/top-up', topUpController);
router.post('/user-ai', purchaseUserAiController);
router.get('/academic-calendar', listCalendarController);

// Platform-wide subscription administration (SaaS SubscriptionManagement screen).
// These two did not exist, so the screen's GET /subscription/all and
// PUT /subscription/:id both 404'd and it rendered an empty table forever.
// Cross-school by design — hence SUPER_ADMIN only.
router.get('/all', authenticate, requireRole(['SUPER_ADMIN']), listAllSubscriptionsController);
router.put('/:id', authenticate, requireRole(['SUPER_ADMIN']), updateSubscriptionController);

export default router;
