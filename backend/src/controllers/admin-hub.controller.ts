import { Request, Response } from 'express';
import { 
    CustomReportService, 
    DataRequestService, 
    InvoiceService, 
    SessionService, 
    AnalyticsService,
    ConsentService,
    NotificationSettingService,
    KanbanService,
    HealthService,
    SafetyService,
    GovernanceService
} from '../services/admin-hub.service';
import { SchoolService } from '../services/school.service';

export class AdminHubController {
    // Reports
    static async getSavedReports(req: Request, res: Response) {
        try {
            const reports = await CustomReportService.getSavedReports(req.query.schoolId as string);
            res.json(reports);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createSavedReport(req: Request, res: Response) {
        try {
            const report = await CustomReportService.createSavedReport(req.query.schoolId as string, req.body);
            res.json(report);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteSavedReport(req: Request, res: Response) {
        try {
            await CustomReportService.deleteSavedReport(req.query.schoolId as string, req.params.id as string);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Data Requests
    static async getDataRequests(req: Request, res: Response) {
        try {
            const requests = await DataRequestService.getRequests(req.query.schoolId as string);
            res.json(requests);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createDataRequest(req: Request, res: Response) {
        try {
            const request = await DataRequestService.createRequest(
                req.query.schoolId as string,
                req.query.branchId as string,
                req.body
            );
            res.json(request);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateDataRequestStatus(req: Request, res: Response) {
        try {
            const request = await DataRequestService.updateRequestStatus(req.params.id as string, req.body.status as string);
            res.json(request);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Invoices
    static async getInvoices(req: Request, res: Response) {
        try {
            const invoices = await InvoiceService.getInvoices(
                req.query.schoolId as string,
                req.query.branchId as string
            );
            res.json(invoices);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createInvoice(req: Request, res: Response) {
        try {
            const invoice = await InvoiceService.createInvoice(
                req.query.schoolId as string,
                req.query.branchId as string,
                req.body
            );
            res.json(invoice);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateInvoiceStatus(req: Request, res: Response) {
        try {
            const invoice = await InvoiceService.updateInvoiceStatus(req.params.id as string, req.body.status as string);
            res.json(invoice);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Sessions
    static async getSessions(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            // @ts-ignore
            const currentSessionToken = req.headers.authorization?.split(' ')[1];
            
            const sessions = await SessionService.getSessions(userId);
            
            // Map to include is_current flag
            const sessionsWithCurrent = sessions.map((s: any) => ({
                ...s,
                is_current: s.token_id === currentSessionToken || s.id === (req as any).sessionId
            }));
            
            res.json(sessionsWithCurrent);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async revokeSession(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            await SessionService.revokeSession(req.params.id as string, userId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async revokeAllOtherSessions(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            // @ts-ignore
            const currentSessionId = req.session?.id; 
            await SessionService.revokeAllOtherSessions(userId, currentSessionId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // School Config (Late Arrival)
    static async getSchoolConfig(req: Request, res: Response) {
        try {
            const schoolId = req.query.schoolId as string;
            const school = await SchoolService.getSchoolById(schoolId, schoolId);
            res.json(school?.settings || {});
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateSchoolConfig(req: Request, res: Response) {
        try {
            const schoolId = req.query.schoolId as string;
            const school = await SchoolService.getSchoolById(schoolId, schoolId);
            const currentSettings = (school?.settings as any) || {};
            const updatedSettings = { ...currentSettings, ...req.body };
            
            await SchoolService.updateSchool(schoolId, schoolId, { settings: updatedSettings });
            res.json(updatedSettings);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Analytics
    static async getEnrollmentTrends(req: Request, res: Response) {
        try {
            const trends = await AnalyticsService.getEnrollmentTrends(req.query.schoolId as string);
            res.json(trends);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Parental Consent
    static async getConsents(req: Request, res: Response) {
        try {
            const consents = await ConsentService.getConsents(req.query.schoolId as string);
            res.json(consents);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateConsentStatus(req: Request, res: Response) {
        try {
            const consent = await ConsentService.updateConsentStatus(req.params.id as string, req.body.status as string);
            res.json(consent);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Notification Settings
    static async getNotificationSettings(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            const settings = await NotificationSettingService.getSettings(userId);
            res.json(settings);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateNotificationSettings(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            const settings = await NotificationSettingService.updateSettings(userId, req.body);
            res.json(settings);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Kanban Board
    static async getKanbanBoard(req: Request, res: Response) {
        try {
            const board = await KanbanService.getBoard(req.query.schoolId as string);
            res.json(board);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createKanbanTask(req: Request, res: Response) {
        try {
            const task = await KanbanService.createTask(req.body.columnId, req.body);
            res.json(task);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async moveKanbanTask(req: Request, res: Response) {
        try {
            const task = await KanbanService.moveTask(req.params.taskId as string, req.body.targetColumnId as string);
            res.json(task);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteKanbanTask(req: Request, res: Response) {
        try {
            await KanbanService.deleteTask(req.params.taskId as string);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Health Logs
    static async getHealthLogs(req: Request, res: Response) {
        try {
            const logs = await HealthService.getHealthLogs(
                req.query.schoolId as string,
                req.query.studentId as string
            );
            res.json(logs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createHealthLog(req: Request, res: Response) {
        try {
            const log = await HealthService.createHealthLog(req.query.schoolId as string, req.body);
            res.json(log);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateHealthLog(req: Request, res: Response) {
        try {
            const log = await HealthService.updateHealthLog(req.params.id as string, req.body);
            res.json(log);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Emergency Alerts
    static async getEmergencyAlerts(req: Request, res: Response) {
        try {
            const alerts = await SafetyService.getEmergencyAlerts(req.query.schoolId as string);
            res.json(alerts);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createEmergencyAlert(req: Request, res: Response) {
        try {
            const alert = await SafetyService.createEmergencyAlert(req.query.schoolId as string, req.body);
            res.json(alert);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateEmergencyAlert(req: Request, res: Response) {
        try {
            const alert = await SafetyService.updateEmergencyAlert(req.params.id as string, req.body);
            res.json(alert);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Health Incidents
    static async getHealthIncidents(req: Request, res: Response) {
        try {
            const incidents = await SafetyService.getHealthIncidents(req.query.schoolId as string);
            res.json(incidents);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createHealthIncident(req: Request, res: Response) {
        try {
            const incident = await SafetyService.createHealthIncident(req.query.schoolId as string, req.body);
            res.json(incident);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateHealthIncident(req: Request, res: Response) {
        try {
            const incident = await SafetyService.updateHealthIncident(req.params.id as string, req.body);
            res.json(incident);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Emergency Drills
    static async getEmergencyDrills(req: Request, res: Response) {
        try {
            const drills = await SafetyService.getEmergencyDrills(req.query.schoolId as string);
            res.json(drills);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createEmergencyDrill(req: Request, res: Response) {
        try {
            const drill = await SafetyService.createEmergencyDrill(req.query.schoolId as string, req.body);
            res.json(drill);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Safeguarding Policies
    static async getSafeguardingPolicies(req: Request, res: Response) {
        try {
            const policies = await SafetyService.getSafeguardingPolicies(req.query.schoolId as string);
            res.json(policies);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createSafeguardingPolicy(req: Request, res: Response) {
        try {
            const policy = await SafetyService.createSafeguardingPolicy(req.query.schoolId as string, req.body);
            res.json(policy);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateSafeguardingPolicy(req: Request, res: Response) {
        try {
            const policy = await SafetyService.updateSafeguardingPolicy(req.params.id as string, req.body);
            res.json(policy);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Governance & Compliance
    static async getGovernanceStats(req: Request, res: Response) {
        try {
            const stats = await GovernanceService.getGovernanceStats(req.query.schoolId as string);
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getComplianceMetrics(req: Request, res: Response) {
        try {
            const metrics = await GovernanceService.getComplianceMetrics(req.query.schoolId as string);
            res.json(metrics);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getValidationAuditCount(req: Request, res: Response) {
        try {
            const count = await GovernanceService.getValidationAuditCount(req.query.schoolId as string);
            res.json({ count });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}

