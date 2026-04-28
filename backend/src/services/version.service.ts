import prisma from '../config/database';

export class VersionService {
    /**
     * Get the last 10 published versions
     */
    static async getLatestVersions() {
        return await prisma.appVersion.findMany({
            where: { is_active: true },
            orderBy: { created_at: 'desc' },
            take: 10
        });
    }

    /**
     * Lock a school to a specific version
     */
    static async setSchoolVersion(schoolId: string, version: string) {
        // First verify the version exists
        const versionExists = await prisma.appVersion.findUnique({
            where: { version }
        });

        if (!versionExists) {
            throw new Error(`Version ${version} does not exist.`);
        }

        return await prisma.school.update({
            where: { id: schoolId },
            data: { platform_version: version }
        });
    }

    /**
     * Internal: Register a new version (for automated scripts)
     */
    static async registerVersion(version: string, description?: string) {
        return await prisma.appVersion.upsert({
            where: { version },
            update: { description, is_active: true },
            create: { version, description, is_active: true }
        });
    }
}
