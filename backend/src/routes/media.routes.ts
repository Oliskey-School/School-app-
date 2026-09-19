import { Router } from 'express';
import { sendSMSLesson, scheduleRadioBroadcast, recordIVRLesson, uploadFile, downloadFile } from '../controllers/media.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';
import { upload, handleUploadError } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.post('/upload', upload.single('file'), handleUploadError, uploadFile);
// One-off repair for a school: inline base64 avatars → stored files (admin).
router.post('/repair-avatars', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), async (req: any, res) => {
    try {
        const { AvatarRepairService } = await import('../services/avatarRepair.service');
        res.json(await AvatarRepairService.repairSchool(req.user.school_id));
    } catch (e: any) { res.status(500).json({ message: e?.message || 'Repair failed' }); }
});
// Local-disk fallback's authenticated retrieval route — see downloadFile's
// comment in media.controller.ts for why this route IS the auth boundary
// for that storage mode. Matches the /api/media/file/<bucket>/<schoolId>/...
// URLs storeUploadedFile hands out when running without S3/Supabase Storage.
router.get('/file/*splat', downloadFile);
router.post('/sms-lesson', sendSMSLesson);
router.post('/radio-schedule', scheduleRadioBroadcast);
router.post('/ivr-record', recordIVRLesson);

export default router;
