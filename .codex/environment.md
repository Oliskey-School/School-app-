# Codex Cloud Environment

## Purpose
Use this repository in an isolated Codex Cloud development/test environment. Do not connect Codex tasks to production Supabase data.

## Repository roles
- Production repository: `Oliskey-School/School-app-`
- Production Vercel project: `school-app`
- Production Supabase project: `School-app-`
- Testing Supabase project: `Testing-school-app-`

## Required runtime
- Node.js 22.x
- npm
- Git
- Prisma CLI/client from the repository lockfile
- Playwright + Chromium
- TypeScript
- Vite
- Vitest

## Required environment variables
Provide test-only values through Codex Cloud environment secrets/variables. Never commit them.

- `DATABASE_URL` — isolated PostgreSQL database for Codex/CI only
- `DIRECT_URL` — isolated PostgreSQL direct connection if required by Prisma
- `VITE_*` / `NEXT_PUBLIC_*` variables required by the application, using test-safe values
- Any application test credentials required by the existing E2E suite

Do not provide production database passwords, Supabase service-role keys, payment production secrets, or other production credentials.

## Database policy
After setup, validate the Prisma schema and deploy migrations only to the isolated test database:

```bash
npx prisma validate --schema=backend/prisma/schema.prisma
npm run db:deploy
npm run db:seed
```

Never run `npm run db:reset`, `prisma migrate reset`, destructive SQL, or production migrations against the production Supabase project.

## Validation gate
Run:

```bash
npm run test:run
npm run build
npm run build:backend
BASE_URL=http://localhost:4173 npx playwright test tests/e2e/production-critical-path.spec.ts --project=chromium --workers=1
BASE_URL=http://localhost:4173 npx playwright test tests/e2e/performance-role-matrix.spec.ts --project=chromium --workers=1
```

Report every command as PASS, FAIL, or NOT RUN with the reason. Never claim a test passed unless it actually ran and passed.
