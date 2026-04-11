import prisma from '../config/database';

export class IntegrationService {
    static async getIntegrations(schoolId: string) {
        return await prisma.externalIntegration.findMany({
            where: { school_id: schoolId },
            orderBy: { integration_name: 'asc' }
        });
    }

    static async updateIntegration(id: string, schoolId: string, data: any) {
        return await prisma.externalIntegration.update({
            where: { id, school_id: schoolId },
            data: {
                is_active: data.is_active,
                last_sync_at: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
                connection_status: data.connection_status
            }
        });
    }

    static async createSyncLog(schoolId: string, data: any) {
        return await prisma.syncLog.create({
            data: {
                school_id: schoolId,
                integration_id: data.integration_id,
                sync_type: data.sync_type || 'Manual',
                sync_direction: data.sync_direction || 'pull',
                triggered_by: data.triggered_by || 'manual',
                status: data.status || 'completed',
                records_processed: data.records_processed || 0,
                records_succeeded: data.records_succeeded || 0,
                error_message: data.error_message || null
            }
        });
    }

    static async getThirdPartyApps() {
        return await prisma.thirdPartyApp.findMany({
            where: { is_published: true },
            orderBy: { rating: 'desc' }
        });
    }

    static async getInstalledApps(schoolId: string) {
        return await prisma.appInstallation.findMany({
            where: { school_id: schoolId, is_active: true }
        });
    }

    static async installApp(schoolId: string, appId: string, installedBy: string) {
        return await prisma.appInstallation.create({
            data: {
                school_id: schoolId,
                app_id: appId,
                installed_by: installedBy || 'system',
                is_active: true
            }
        });
    }

    static async uninstallApp(schoolId: string, appId: string) {
        return await prisma.appInstallation.updateMany({
            where: { school_id: schoolId, app_id: appId, is_active: true },
            data: {
                is_active: false,
                uninstalled_at: new Date()
            }
        });
    }
}
