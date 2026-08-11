import { Router } from 'express';
import {
    getFacilities, createFacility, updateFacility, deleteFacility,
    getAssets, createAsset, updateAsset, deleteAsset, getAssetDetail, getAssetByQrCode,
    getVisitorLogs, createVisitorLog, updateVisitorLog,
    getDocuments, createDocument, deleteDocument,
    createBackup, getBackups, restoreBackup, deleteBackup,
    getSavedReports, createSavedReport, deleteSavedReport
} from '../controllers/infrastructure.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/facilities', getFacilities);
router.post('/facilities', requireRole(ADMIN_ROLES), createFacility);
router.put('/facilities/:id', requireRole(ADMIN_ROLES), updateFacility);
router.delete('/facilities/:id', requireRole(ADMIN_ROLES), deleteFacility);

router.get('/assets', getAssets);
router.post('/assets', requireRole(ADMIN_ROLES), createAsset);
router.get('/assets/qr/:qrCode', getAssetByQrCode);
router.get('/assets/:id', getAssetDetail);
router.put('/assets/:id', requireRole(ADMIN_ROLES), updateAsset);
router.delete('/assets/:id', requireRole(ADMIN_ROLES), deleteAsset);

router.get('/visitor-logs', getVisitorLogs);
router.post('/visitor-logs', requireRole(ADMIN_ROLES), createVisitorLog);
router.put('/visitor-logs/:id', requireRole(ADMIN_ROLES), updateVisitorLog);

router.get('/documents', getDocuments);
router.post('/documents', requireRole(ADMIN_ROLES), createDocument);
router.delete('/documents/:id', requireRole(ADMIN_ROLES), deleteDocument);

router.get('/backups', requireRole(ADMIN_ROLES), getBackups);
router.post('/backups', requireRole(ADMIN_ROLES), createBackup);
router.post('/backups/:id/restore', requireRole(ADMIN_ROLES), restoreBackup);
router.delete('/backups/:id', requireRole(ADMIN_ROLES), deleteBackup);

// Saved Reports
router.get('/reports', getSavedReports);
router.post('/reports', requireRole(ADMIN_ROLES), createSavedReport);
router.delete('/reports/:id', requireRole(ADMIN_ROLES), deleteSavedReport);

export default router;
