import { Router } from 'express';
import { OfflineChannelController } from '../controllers/offline-channel.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Radio
router.get('/radio-content', OfflineChannelController.getRadioContent);
router.post('/radio-content', OfflineChannelController.createRadioContent);
router.get('/radio-broadcasts', OfflineChannelController.getRadioBroadcasts);
router.get('/radio-partners', OfflineChannelController.getRadioPartners);

// IVR
router.get('/ivr-lessons', OfflineChannelController.getIVRLessons);
router.post('/ivr-lessons', OfflineChannelController.createIVRLesson);
router.get('/ivr-calls', OfflineChannelController.getIVRCalls);

// SMS
router.get('/sms-lessons', OfflineChannelController.getSMSLessons);
router.post('/sms-lessons', OfflineChannelController.createSMSLesson);
router.get('/sms-schedules', OfflineChannelController.getSMSSchedules);

// USSD
router.get('/ussd-menu-structure', OfflineChannelController.getUSSDMenus);
router.get('/ussd-sessions', OfflineChannelController.getUSSDSessions);
router.get('/ussd-transactions', OfflineChannelController.getUSSDTransactions);

export default router;
