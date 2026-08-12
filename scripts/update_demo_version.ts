import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
    const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

    // Always sync to the REAL current app version instead of a hardcoded string
    // (the old value was pinned at 0.5.32, which re-triggered the "update required"
    // prompt). Source of truth: VITE_APP_VERSION env -> package.json "version".
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    const NEW_VERSION = (process.env.VITE_APP_VERSION || pkg.version || '').trim();

    if (!NEW_VERSION) {
        console.error('❌ [SYNC] Could not resolve a version from package.json / VITE_APP_VERSION.');
        process.exit(1);
    }

    console.log(`🚀 [SYNC] Syncing platform version to ${NEW_VERSION}...`);

    try {
        // 1. Pin the demo school to the current version.
        await prisma.$executeRaw`
            UPDATE "School"
            SET platform_version = ${NEW_VERSION},
                updated_at = NOW()
            WHERE id = ${DEMO_SCHOOL_ID}
        `;

        // 2. Register the version in the AppVersion registry so the in-app
        //    "latest available" check (GET /versions) reports the real newest
        //    version — this is what the UpdatePrompt shows to users. Raw SQL keeps
        //    this working regardless of which Prisma client is generated.
        await prisma.$executeRaw`
            INSERT INTO "AppVersion" (id, version, description, is_active, created_at)
            VALUES (gen_random_uuid(), ${NEW_VERSION}, 'Auto-registered on release', true, NOW())
            ON CONFLICT (version) DO UPDATE SET is_active = true
        `;

        console.log(`✅ [SYNC] Success! Demo School + version registry are now at ${NEW_VERSION}.`);
    } catch (error: any) {
        if (error.code === 'P2025') {
            console.error('❌ [SYNC] Error: Demo School record not found in database.');
        } else {
            console.error('❌ [SYNC] Unexpected error:', error.message);
        }
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
