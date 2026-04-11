import { Response } from 'express';
import { IntegrationService } from '../services/integration.service';
import { AuthRequest } from '../middleware/auth';

export const getIntegrations = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const integrations = await IntegrationService.getIntegrations(school_id);
        res.json(integrations);
    } catch (error: any) {
        console.error('Error in getIntegrations controller:', error);
        res.status(500).json({ error: 'Failed to fetch integrations', message: error.message });
    }
};

export const updateIntegration = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const { id } = req.params;
        const integration = await IntegrationService.updateIntegration(id, school_id, req.body);
        res.json(integration);
    } catch (error: any) {
        console.error('Error in updateIntegration controller:', error);
        res.status(500).json({ error: 'Failed to update integration', message: error.message });
    }
};

export const createSyncLog = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const log = await IntegrationService.createSyncLog(school_id, req.body);
        res.status(201).json(log);
    } catch (error: any) {
        console.error('Error in createSyncLog controller:', error);
        res.status(500).json({ error: 'Failed to create sync log', message: error.message });
    }
};

export const getThirdPartyApps = async (req: AuthRequest, res: Response) => {
    try {
        const apps = await IntegrationService.getThirdPartyApps();
        res.json(apps);
    } catch (error: any) {
        console.error('Error in getThirdPartyApps controller:', error);
        res.status(500).json({ error: 'Failed to fetch third-party apps', message: error.message });
    }
};

export const getInstalledApps = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const installations = await IntegrationService.getInstalledApps(school_id);
        res.json(installations);
    } catch (error: any) {
        console.error('Error in getInstalledApps controller:', error);
        res.status(500).json({ error: 'Failed to fetch installed apps', message: error.message });
    }
};

export const installApp = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id, id: user_id } = req.user;
        const { appId } = req.body;
        const installation = await IntegrationService.installApp(school_id, appId, user_id);
        res.status(201).json(installation);
    } catch (error: any) {
        console.error('Error in installApp controller:', error);
        res.status(500).json({ error: 'Failed to install app', message: error.message });
    }
};

export const uninstallApp = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const { appId } = req.params;
        await IntegrationService.uninstallApp(school_id, appId);
        res.json({ message: 'App uninstalled successfully' });
    } catch (error: any) {
        console.error('Error in uninstallApp controller:', error);
        res.status(500).json({ error: 'Failed to uninstall app', message: error.message });
    }
};
