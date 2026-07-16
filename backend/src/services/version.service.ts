import prisma from '../config/database';
import { CacheService } from './cache.service';

const VERSIONS_CACHE_KEY = 'app-versions:latest';
const VERSIONS_CACHE_TTL_S = 300; // 5 min — versions change rarely; every authenticated request hits this

export class VersionService {
    /**
     * Get the last 10 published versions. Cached: this is read on every app
     * load by every user of every school, and versions change only when an
     * admin explicitly registers one (which invalidates the cache below).
     */
    static async getLatestVersions() {
        return CacheService.getOrSet(VERSIONS_CACHE_KEY, VERSIONS_CACHE_TTL_S, () =>
            prisma.appVersion.findMany({
                where: { is_active: true },
                orderBy: { created_at: 'desc' },
                take: 10
            })
        );
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
        const result = await prisma.appVersion.upsert({
            where: { version },
            update: { description, is_active: true },
            create: { version, description, is_active: true }
        });
        await CacheService.invalidate(VERSIONS_CACHE_KEY);
        return result;
    }
}
