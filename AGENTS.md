# Codex Engineering Rules — Oliskey School App

## Mission
Treat this repository as a production school-management SaaS. Make the smallest safe change that solves the task, preserve existing architecture, and never claim a test passed unless it actually ran and passed.

## Before changing code
1. Inspect the relevant code, tests, database schema/migrations, and existing patterns.
2. Check tenant boundaries: every school-scoped operation must preserve `school_id`; branch-scoped operations must preserve both `school_id` and `branch_id`.
3. Do not use production Supabase data for destructive tests.
4. Do not expose secrets, tokens, database passwords, or service-role keys in source, logs, tests, or PRs.

## Required validation
For every non-trivial change, run the narrowest relevant tests first, then the full applicable gate before declaring the work ready:

- `npm ci` when dependencies changed or the environment is fresh.
- `npm run test:run`
- `npm run build`
- `npm run build:backend` when backend/Prisma code changes.
- `npx prisma validate --schema=backend/prisma/schema.prisma` for Prisma/schema changes.
- `npm run db:deploy` only against an isolated CI/test database, never production.
- `npx playwright install --with-deps chromium` when required by the environment.
- `BASE_URL=http://localhost:4173 npx playwright test tests/e2e/production-critical-path.spec.ts --project=chromium --workers=1`
- `BASE_URL=http://localhost:4173 npx playwright test tests/e2e/performance-role-matrix.spec.ts --project=chromium --workers=1`

If a required test cannot run, report it as **NOT RUN** with the exact reason. Never convert an unavailable test into PASS.

## Deployment policy
- Work in an isolated branch/worktree.
- Test before creating a PR.
- Never push experimental code directly to `main` when a PR workflow is available.
- Never apply destructive or unverified database changes to production.
- Vercel production is a release target, not the test environment.
- Production Supabase is never a disposable test database.
- Prefer the testing Vercel/Supabase environment for integration verification.

## Definition of done
A change is ready for review only when:
1. The requested behavior is implemented.
2. Relevant tests pass.
3. Build/type/schema checks pass when applicable.
4. No new tenant-isolation or security regression is evident.
5. The final report lists exactly what ran, what passed, what failed, and what was not run.

## Reporting format
Use:
- ROOT CAUSE
- CHANGES
- TESTS RUN
- PASS/FAIL/NOT RUN
- REMAINING BLOCKERS

Do not invent performance numbers, CI results, deployment health, or database validation results.
