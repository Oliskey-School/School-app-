import { Router } from 'express';
import {
    getCurrentTermController,
    getQuoteController,
    activateSubscriptionController,
    listCalendarController,
    topUpController,
    purchaseUserAiController,
} from '../controllers/subscription.controller';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

// This router is mounted with `authenticate, requireTenant` (routes/index.ts),
// and requireTenant only proves the caller has a school — it checks no role.
// The two endpoints below rewrite the SCHOOL's billing row, so without a role
// check any authenticated member of the school could change it: a student could
// POST /activate {plan_type:'free'} and downgrade the whole school's plan,
// zero its term amount and burn `trial_used`, since the free plan short-circuits
// payment verification entirely.
const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

router.get('/current-term', getCurrentTermController);
router.get('/quote', getQuoteController);
router.post('/activate', requireRole(ADMIN_ROLES), activateSubscriptionController);
router.post('/top-up', requireRole(ADMIN_ROLES), topUpController);
// Deliberately NOT admin-only: this one acts on req.user.id, not on the school.
// It is how an individual teacher or student buys AI for their OWN account on a
// Basic plan, so restricting it would remove the feature it exists to provide.
router.post('/user-ai', purchaseUserAiController);
router.get('/academic-calendar', listCalendarController);

export default router;
