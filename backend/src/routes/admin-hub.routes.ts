import { Router } from 'express';
import { AdminHubController } from '../controllers/admin-hub.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Saved Reports
router.get('/reports/saved', authenticate, AdminHubController.getSavedReports);
router.post('/reports/saved', authenticate, AdminHubController.createSavedReport);
router.delete('/reports/saved/:id', authenticate, AdminHubController.deleteSavedReport);

// Data Requests
router.get('/data-requests', authenticate, AdminHubController.getDataRequests);
router.post('/data-requests', authenticate, AdminHubController.createDataRequest);
router.patch('/data-requests/:id', authenticate, AdminHubController.updateDataRequestStatus);

// Invoices
router.get('/invoices', authenticate, AdminHubController.getInvoices);
router.post('/invoices', authenticate, AdminHubController.createInvoice);
router.patch('/invoices/:id', authenticate, AdminHubController.updateInvoiceStatus);

// Sessions
router.get('/sessions', authenticate, AdminHubController.getSessions);
router.delete('/sessions/:id', authenticate, AdminHubController.revokeSession);
router.delete('/sessions/revoke/all', authenticate, AdminHubController.revokeAllOtherSessions);

// School Config & Analytics
router.get('/config', authenticate, AdminHubController.getSchoolConfig);
router.patch('/config', authenticate, AdminHubController.updateSchoolConfig);
// Parental Consent
router.get('/consents', authenticate, AdminHubController.getConsents);
router.patch('/consents/:id', authenticate, AdminHubController.updateConsentStatus);

// Notification Settings
router.get('/notifications/settings', authenticate, AdminHubController.getNotificationSettings);
router.patch('/notifications/settings', authenticate, AdminHubController.updateNotificationSettings);

// Kanban Board
router.get('/kanban', authenticate, AdminHubController.getKanbanBoard);
router.post('/kanban/tasks', authenticate, AdminHubController.createKanbanTask);
router.patch('/kanban/tasks/:taskId', authenticate, AdminHubController.moveKanbanTask);
router.delete('/kanban/tasks/:taskId', authenticate, AdminHubController.deleteKanbanTask);

// Health & Safety
router.get('/health-logs', authenticate, AdminHubController.getHealthLogs);
router.post('/health-logs', authenticate, AdminHubController.createHealthLog);
router.patch('/health-logs/:id', authenticate, AdminHubController.updateHealthLog);

router.get('/safety/alerts', authenticate, AdminHubController.getEmergencyAlerts);
router.post('/safety/alerts', authenticate, AdminHubController.createEmergencyAlert);
router.patch('/safety/alerts/:id', authenticate, AdminHubController.updateEmergencyAlert);

router.get('/safety/incidents', authenticate, AdminHubController.getHealthIncidents);
router.post('/safety/incidents', authenticate, AdminHubController.createHealthIncident);
router.patch('/safety/incidents/:id', authenticate, AdminHubController.updateHealthIncident);

router.get('/safety/drills', authenticate, AdminHubController.getEmergencyDrills);
router.post('/safety/drills', authenticate, AdminHubController.createEmergencyDrill);

router.get('/safety/policies', authenticate, AdminHubController.getSafeguardingPolicies);
router.post('/safety/policies', authenticate, AdminHubController.createSafeguardingPolicy);
router.patch('/safety/policies/:id', authenticate, AdminHubController.updateSafeguardingPolicy);

// Governance & Compliance
router.get('/governance/stats', authenticate, AdminHubController.getGovernanceStats);
router.get('/governance/compliance-metrics', authenticate, AdminHubController.getComplianceMetrics);
router.get('/governance/audit-count', authenticate, AdminHubController.getValidationAuditCount);

export default router;
