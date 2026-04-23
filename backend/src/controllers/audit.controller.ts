import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const branchId = getEffectiveBranchId(req.user, (req.headers['x-branch-id'] as string) || (req.query.branchId as string));
        
        const filters = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            actionType: req.query.actionType as string,
            riskLevel: req.query.riskLevel as string,
            searchTerm: req.query.searchTerm as string,
            limit: req.query.limit as string
        };

        const logs = await AuditService.getLogs(school_id, branchId, filters);
        
        // Map back to the format the UI expects for backward compatibility if needed
        const mappedLogs = logs.map(log => ({
            id: log.id,
            user_email: log.user?.email || 'System',
            user_role: log.user?.role || 'SYSTEM',
            action_type: log.action_type || log.action,
            resource_type: log.entity_type,
            resource_id: log.entity_id,
            action_description: log.action_description || log.action,
            old_values: log.old_values,
            new_values: log.new_values,
            performed_at: log.performed_at,
            ip_address: log.ip_address,
            status: log.status,
            risk_level: log.risk_level,
            is_sensitive: log.is_sensitive
        }));

        res.json(mappedLogs);
    } catch (error: any) {
        console.error('Error in getAuditLogs controller:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs', message: error.message });
    }
};

export const createAuditLog = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id, id: user_id } = req.user;
        const branchId = getEffectiveBranchId(req.user, (req.headers['x-branch-id'] as string) || (req.body?.branch_id));
        
        const logData = {
            ...req.body,
            user_id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        };

        const log = await AuditService.createLog(school_id, branchId, logData);
        res.status(201).json(log);
    } catch (error: any) {
        console.error('Error in createAuditLog controller:', error);
        res.status(500).json({ error: 'Failed to create audit log', message: error.message });
    }
};
