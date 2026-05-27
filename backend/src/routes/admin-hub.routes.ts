import { Router } from 'express';
import { AdminHubController } from '../controllers/admin-hub.controller';
import { RoleController } from '../controllers/role.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

// All admin-hub routes require authentication AND an admin-tier role.
// Apply guards at the router level so every endpoint is covered, including any future ones.
const ADMIN_ROLES = ['admin', 'super_admin', 'proprietor', 'compliance_officer'];
router.use(authenticate, requireRole(ADMIN_ROLES));

// Saved Reports
router.get('/reports/saved', AdminHubController.getSavedReports);
router.post('/reports/saved', AdminHubController.createSavedReport);
router.delete('/reports/saved/:id', AdminHubController.deleteSavedReport);

// Data Requests
router.get('/data-requests', AdminHubController.getDataRequests);
router.post('/data-requests', AdminHubController.createDataRequest);
router.patch('/data-requests/:id', AdminHubController.updateDataRequestStatus);

// Roles & Permissions
router.get('/roles/permissions', RoleController.getRolePermissions);
router.post('/roles/permissions', RoleController.updateRolePermission);

// Invoices
router.get('/invoices', AdminHubController.getInvoices);
router.post('/invoices', AdminHubController.createInvoice);
router.patch('/invoices/:id', AdminHubController.updateInvoiceStatus);

// Sessions
router.get('/sessions', AdminHubController.getSessions);
router.delete('/sessions/:id', AdminHubController.revokeSession);
router.delete('/sessions/revoke/all', AdminHubController.revokeAllOtherSessions);

// School Config & Analytics
router.get('/config', AdminHubController.getSchoolConfig);
router.patch('/config', AdminHubController.updateSchoolConfig);
router.get('/analytics/enrollment-trends', AdminHubController.getEnrollmentTrends);
// Parental Consent
router.get('/consents', AdminHubController.getConsents);
router.patch('/consents/:id', AdminHubController.updateConsentStatus);

// Notification Settings
router.get('/notifications/settings', AdminHubController.getNotificationSettings);
router.patch('/notifications/settings', AdminHubController.updateNotificationSettings);

// Kanban Board
router.get('/kanban', AdminHubController.getKanbanBoard);
router.post('/kanban/tasks', AdminHubController.createKanbanTask);
router.patch('/kanban/tasks/:taskId', AdminHubController.moveKanbanTask);
router.delete('/kanban/tasks/:taskId', AdminHubController.deleteKanbanTask);

// Health & Safety
router.get('/health-logs', AdminHubController.getHealthLogs);
router.post('/health-logs', AdminHubController.createHealthLog);
router.patch('/health-logs/:id', AdminHubController.updateHealthLog);
router.delete('/health-logs/:id', AdminHubController.deleteHealthLog);

router.get('/safety/alerts', AdminHubController.getEmergencyAlerts);
router.post('/safety/alerts', AdminHubController.createEmergencyAlert);
router.patch('/safety/alerts/:id', AdminHubController.updateEmergencyAlert);

router.get('/safety/incidents', AdminHubController.getHealthIncidents);
router.post('/safety/incidents', AdminHubController.createHealthIncident);
router.patch('/safety/incidents/:id', AdminHubController.updateHealthIncident);

router.get('/safety/drills', AdminHubController.getEmergencyDrills);
router.post('/safety/drills', AdminHubController.createEmergencyDrill);

router.get('/safety/policies', AdminHubController.getSafeguardingPolicies);
router.post('/safety/policies', AdminHubController.createSafeguardingPolicy);
router.patch('/safety/policies/:id', AdminHubController.updateSafeguardingPolicy);

// Governance & Compliance
router.get('/governance/stats', AdminHubController.getGovernanceStats);
router.get('/governance/compliance-metrics', AdminHubController.getComplianceMetrics);
router.get('/governance/audit-count', AdminHubController.getValidationAuditCount);

export default router;
