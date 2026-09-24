/**
 * Apply Prisma migrations during a Vercel build — for PRODUCTION deployments only.
 *
 * `build:vercel` used to begin with a bare `npx prisma migrate deploy`, which ran
 * on every deployment Vercel makes, preview builds included. That is wrong in
 * both of the ways it can go:
 *
 *   - If a preview environment has no database credentials, the very first step
 *     of the build fails and the whole deployment is marked failed. Every recent
 *     preview did fail this way while production kept succeeding, including on
 *     commits that touch no backend code at all.
 *
 *   - If a preview environment *does* carry the production credentials, which is
 *     the common default, then every push to any branch ran `migrate deploy`
 *     against the live production database. A feature branch could migrate
 *     production before anyone reviewed it.
 *
 * Gating on VERCEL_ENV fixes both without changing what production does. Vercel
 * sets it to 'production', 'preview' or 'development'.
 *
 * The check is deliberately positive — migrate only when the value is exactly
 * 'production' — so an unset or unexpected value skips rather than guesses. A
 * skipped migration leaves the database untouched and is trivially recoverable;
 * a wrongly-applied one is not.
 */
import { spawnSync } from 'node:child_process';

const env = process.env.VERCEL_ENV;

if (env !== 'production') {
    console.log(`[migrate] VERCEL_ENV=${env ?? '(unset)'} — skipping "prisma migrate deploy". Migrations run on production deployments only.`);
    process.exit(0);
}

console.log('[migrate] VERCEL_ENV=production — applying pending migrations.');

const result = spawnSync(
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema=backend/prisma/schema.prisma'],
    { stdio: 'inherit', shell: process.platform === 'win32' },
);

if (result.error) {
    console.error('[migrate] failed to start prisma:', result.error.message);
    process.exit(1);
}

// A non-zero exit must fail the build. A deployment whose migrations did not
// apply would otherwise serve new code against an older schema.
process.exit(result.status ?? 1);
