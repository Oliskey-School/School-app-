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

router.get('/current-term', getCurrentTermController);
router.get('/quote', getQuoteController);
router.post('/activate', activateSubscriptionController);
router.post('/top-up', topUpController);
router.post('/user-ai', purchaseUserAiController);
router.get('/academic-calendar', listCalendarController);

export default router;
