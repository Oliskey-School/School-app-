import { Router } from 'express';
import {
    getCurrentTermController,
    getQuoteController,
    activateSubscriptionController,
    listCalendarController,
    topUpController,
    purchaseUserAiController,
} from '../controllers/subscription.controller';

const router = Router();
// Mounted behind authenticate + requireTenant (routes/index.ts): every handler
// runs in the caller's tenant scope. Never widen it to platform scope here.

router.get('/current-term', getCurrentTermController);
router.get('/quote', getQuoteController);
router.post('/activate', activateSubscriptionController);
router.post('/top-up', topUpController);
router.post('/user-ai', purchaseUserAiController);
router.get('/academic-calendar', listCalendarController);

export default router;
