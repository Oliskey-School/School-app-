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
import { getEffectiveBranchId } from '../utils/branchScope';

function branchOf(req: Request, override?: string): string | undefined {
    return getEffectiveBranchId((req as any).user, override);
}

export class AdminHubController {
    // Reports
    static async getSavedReports(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const reports = await CustomReportService.getSavedReports((req as any).user.school_id, branchId);
            res.json(reports);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createSavedReport(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.body.branch_id);
            const report = await CustomReportService.createSavedReport((req as any).user.school_id, branchId, req.body);
            res.json(report);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteSavedReport(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            await CustomReportService.deleteSavedReport((req as any).user.school_id, branchId, req.params.id as string);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Data Requests
    static async getDataRequests(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const requests = await DataRequestService.getRequests((req as any).user.school_id, branchId);
            res.json(requests);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createDataRequest(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, (req.query.branchId as string) || req.body.branch_id);
            const request = await DataRequestService.createRequest(
                (req as any).user.school_id,
                branchId,
                req.body
            );
            res.json(request);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateDataRequestStatus(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const request = await DataRequestService.updateRequestStatus(req.params.id as string, (req as any).user.school_id, branchId, req.body.status as string);
            res.json(request);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    // Invoices
    static async getInvoices(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const invoices = await InvoiceService.getInvoices(
                (req as any).user.school_id,
                branchId
            );
            res.json(invoices);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createInvoice(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, (req.query.branchId as string) || req.body.branch_id);
            const invoice = await InvoiceService.createInvoice(
                (req as any).user.school_id,
                branchId,
                req.body
            );
            res.json(invoice);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateInvoiceStatus(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const invoice = await InvoiceService.updateInvoiceStatus(req.params.id as string, (req as any).user.school_id, branchId, req.body.status as string);
            res.json(invoice);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    // Sessions
    static async getSessions(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            // @ts-ignore
            const currentSid = req.user?.sid;

            const sessions = await SessionService.getSessions(userId);

            // Map to include is_current flag. `currentSid` is the session id embedded in
            // THIS request's access token (see auth.service#generateTokens); it matches
            // the `token_id` the session row was created/upserted with. Previously this
            // compared the raw access token string to a value derived from the refresh
            // token, which could never match — so "is_current" was always false and the
            // Revoke button was shown for the user's own live session, letting a
            // self-revoke silently log them out with no recovery.
            const sessionsWithCurrent = sessions.map((s: any) => ({
                ...s,
                is_current: !!currentSid && s.token_id === currentSid
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
            // @ts-ignore
            const currentSid = req.user?.sid;
            await SessionService.revokeSession(req.params.id as string, userId, currentSid);
            res.json({ success: true });
        } catch (error: any) {
            res.status(/own active session/i.test(error.message) ? 400 : 500).json({ error: error.message });
        }
    }

    static async revokeAllOtherSessions(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.id;
            // @ts-ignore
            const currentSid = req.user?.sid;
            await SessionService.revokeAllOtherSessions(userId, currentSid);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // School Config (Late Arrival)
    static async getSchoolConfig(req: Request, res: Response) {
        try {
            const schoolId = (req as any).user.school_id;
            const school = await SchoolService.getSchoolById(schoolId, schoolId);
            res.json(school?.settings || {});
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateSchoolConfig(req: Request, res: Response) {
        try {
            const schoolId = (req as any).user.school_id;
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
            const branchId = branchOf(req, req.query.branchId as string);
            const trends = await AnalyticsService.getEnrollmentTrends((req as any).user.school_id, branchId);
            res.json(trends);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Parental Consent
    static async getConsents(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const consents = await ConsentService.getConsents((req as any).user.school_id, branchId);
            res.json(consents);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateConsentStatus(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const consent = await ConsentService.updateConsentStatus(req.params.id as string, (req as any).user.school_id, branchId, req.body.status as string);
            res.json(consent);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
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
            const branchId = branchOf(req, req.query.branchId as string);
            const board = await KanbanService.getBoard((req as any).user.school_id, branchId);
            res.json(board);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createKanbanTask(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const task = await KanbanService.createTask(req.body.columnId, (req as any).user.school_id, branchId, req.body);
            res.json(task);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    static async moveKanbanTask(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const task = await KanbanService.moveTask(req.params.taskId as string, req.body.targetColumnId as string, (req as any).user.school_id, branchId);
            res.json(task);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    static async deleteKanbanTask(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            await KanbanService.deleteTask(req.params.taskId as string, (req as any).user.school_id, branchId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    // Health Logs
    static async getHealthLogs(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const logs = await HealthService.getHealthLogs(
                (req as any).user.school_id,
                branchId,
                req.query.studentId as string
            );
            res.json(logs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createHealthLog(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.body.branch_id);
            const log = await HealthService.createHealthLog((req as any).user.school_id, branchId, req.body);
            res.json(log);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateHealthLog(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const log = await HealthService.updateHealthLog(req.params.id as string, (req as any).user.school_id, branchId, req.body);
            res.json(log);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    static async deleteHealthLog(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            await HealthService.deleteHealthLog(req.params.id as string, (req as any).user.school_id, branchId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
    // Emergency Alerts
    static async getEmergencyAlerts(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const alerts = await SafetyService.getEmergencyAlerts((req as any).user.school_id, branchId);
            res.json(alerts);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createEmergencyAlert(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.body.branch_id);
            const alert = await SafetyService.createEmergencyAlert((req as any).user.school_id, branchId, req.body);
            res.json(alert);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateEmergencyAlert(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const alert = await SafetyService.updateEmergencyAlert(req.params.id as string, (req as any).user.school_id, branchId, req.body);
            res.json(alert);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    // Health Incidents
    static async getHealthIncidents(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const incidents = await SafetyService.getHealthIncidents((req as any).user.school_id, branchId);
            res.json(incidents);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createHealthIncident(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.body.branch_id);
            const incident = await SafetyService.createHealthIncident((req as any).user.school_id, branchId, req.body);
            res.json(incident);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateHealthIncident(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const incident = await SafetyService.updateHealthIncident(req.params.id as string, (req as any).user.school_id, branchId, req.body);
            res.json(incident);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    // Emergency Drills
    static async getEmergencyDrills(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const drills = await SafetyService.getEmergencyDrills((req as any).user.school_id, branchId);
            res.json(drills);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createEmergencyDrill(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.body.branch_id);
            const drill = await SafetyService.createEmergencyDrill((req as any).user.school_id, branchId, req.body);
            res.json(drill);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // Safeguarding Policies
    static async getSafeguardingPolicies(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const policies = await SafetyService.getSafeguardingPolicies((req as any).user.school_id, branchId);
            res.json(policies);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createSafeguardingPolicy(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, (req.query.branchId as string) || req.body.branch_id);
            const policy = await SafetyService.createSafeguardingPolicy((req as any).user.school_id, branchId, req.body);
            res.json(policy);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateSafeguardingPolicy(req: Request, res: Response) {
        try {
            const branchId = branchOf(req);
            const policy = await SafetyService.updateSafeguardingPolicy(req.params.id as string, (req as any).user.school_id, branchId, req.body);
            res.json(policy);
        } catch (error: any) {
            res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
        }
    }

    // Governance & Compliance
    static async getGovernanceStats(req: Request, res: Response) {
        try {
            const branchId = branchOf(req, req.query.branchId as string);
            const stats = await GovernanceService.getGovernanceStats((req as any).user.school_id, branchId);
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getComplianceMetrics(req: Request, res: Response) {
        try {
            const metrics = await GovernanceService.getComplianceMetrics((req as any).user.school_id);
            res.json(metrics);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getValidationAuditCount(req: Request, res: Response) {
        try {
            const count = await GovernanceService.getValidationAuditCount((req as any).user.school_id);
            res.json({ count });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
