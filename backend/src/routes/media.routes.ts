import { Router } from 'express';
import { sendSMSLesson, scheduleRadioBroadcast, recordIVRLesson } from '../controllers/media.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.post('/sms-lesson', sendSMSLesson);
router.post('/radio-schedule', scheduleRadioBroadcast);
router.post('/ivr-record', recordIVRLesson);

export default router;
