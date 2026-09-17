import prisma, { getRawPrisma } from '../config/database';
import { CacheService } from './cache.service';
// Static import so the build traces it: tsc copies it to backend/dist/package.json
// (rootDir is the repo root, see api/index.js) and the compiled relative path
// still resolves. The previous cwd-based fs read in the seeder returned a
// hard-coded '0.5.38' fallback anywhere cwd wasn't the repo root.
import rootPackage from '../../../package.json';

const VERSIONS_CACHE_KEY = 'app-versions:latest';
const VERSIONS_CACHE_TTL_S = 300; // 5 min — versions change rarely; every authenticated request hits this

/** The version of the code this process is running: the same package.json the
 *  frontend build bakes into APP_VERSION, so the two can only differ when the
 *  served bundle and the API genuinely come from different commits. */
export const RUNNING_VERSION: string = (rootPackage as { version?: string }).version || '0.0.0';

export class VersionService {
    private static registration: Promise<boolean> | null = null;

    /**
     * Make sure the version this process is running is in the registry.
     *
     * Registration used to live only in DemoSeederService.ensureDemoData(),
     * which server.ts runs at startup — and Vercel never runs server.ts
     * (api/index.js loads app.ts directly), so production never registered
     * anything. Doing it here, from whichever process answers "what is the
     * latest version?", makes the answer self-consistent on every host: the
     * first /api/versions call served by a new deployment registers that
     * deployment. Idempotent upsert, memoised per process, and a failure is
     * logged loudly and retried on the next call rather than swallowed;
     * resolves to whether the registry now holds the running version.
     *
     * Preview deployments share the production database, and a preview build
     * is not something production users can update to — registering it would
     * hand every real user a mandatory "update" that no reload can satisfy.
     */
    static ensureRunningVersionRegistered(): Promise<boolean> {
        if (process.env.VERCEL_ENV === 'preview') return Promise.resolve(false);
        if (!this.registration) {
            this.registration = this.registerVersion(RUNNING_VERSION, `Automatic sync for ${RUNNING_VERSION}`)
                .then(() => true)
                .catch((err) => {
                    this.registration = null;
                    console.error(`❌ [Version] Could not register running version v${RUNNING_VERSION}:`, err?.message || err);
                    return false;
                });
        }
        return this.registration;
    }

    /**
     * Get the last 10 published versions. Cached: this is read on every app
     * load by every user of every school, and versions change only when a
     * deployment registers itself or an admin explicitly registers one (both
     * invalidate the cache below).
     */
    static async getLatestVersions() {
        await this.ensureRunningVersionRegistered();
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
     *
     * AppVersion is platform-global, and its RLS policy only admits writes
     * under the explicit bypass flag — which the default client sets only
     * when there is no tenant context. This can be called from inside a
     * school admin's request (via getLatestVersions above), where the
     * request's school_id would be set instead and the insert would be
     * denied, so it always goes through the privileged client.
     */
    static async registerVersion(version: string, description?: string) {
        const result = await getRawPrisma().appVersion.upsert({
            where: { version },
            update: { description, is_active: true },
            create: { version, description, is_active: true }
        });
        await CacheService.invalidate(VERSIONS_CACHE_KEY);
        return result;
    }
}
