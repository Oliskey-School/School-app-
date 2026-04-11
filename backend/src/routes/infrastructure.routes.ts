import { Router } from 'express';
import {
    getFacilities, createFacility, updateFacility, deleteFacility,
    getAssets, createAsset, updateAsset, deleteAsset,
    getVisitorLogs, createVisitorLog, updateVisitorLog,
    getDocuments, createDocument, deleteDocument,
    createBackup, getBackups, restoreBackup, deleteBackup,
    getSavedReports, createSavedReport, deleteSavedReport
} from '../controllers/infrastructure.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/facilities', getFacilities);
router.post('/facilities', createFacility);
router.put('/facilities/:id', updateFacility);
router.delete('/facilities/:id', deleteFacility);

router.get('/assets', getAssets);
router.post('/assets', createAsset);
router.put('/assets/:id', updateAsset);
router.delete('/assets/:id', deleteAsset);

router.get('/visitor-logs', getVisitorLogs);
router.post('/visitor-logs', createVisitorLog);
router.put('/visitor-logs/:id', updateVisitorLog);

router.get('/documents', getDocuments);
router.post('/documents', createDocument);
router.delete('/documents/:id', deleteDocument);

router.get('/backups', getBackups);
router.post('/backups', createBackup);
router.post('/backups/:id/restore', restoreBackup);
router.delete('/backups/:id', deleteBackup);

// Saved Reports
router.get('/reports', getSavedReports);
router.post('/reports', createSavedReport);
router.delete('/reports/:id', deleteSavedReport);

export default router;
