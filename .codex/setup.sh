#!/usr/bin/env bash
set -euo pipefail

# Codex Cloud setup for isolated development/testing.
# Never point DATABASE_URL at production.

printf '\n== Codex environment preflight ==\n'
printf 'Node: '; node --version
printf 'npm:  '; npm --version
printf 'OS:   '; uname -a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo 'WARNING: DATABASE_URL is not set. Database migrations/tests will be unavailable until Codex Cloud provides an isolated test database.'
else
  echo 'DATABASE_URL: configured (value intentionally hidden)'
fi

echo '== Installing locked dependencies =='
npm ci

echo '== Generating Prisma clients =='
npx prisma generate
npx prisma generate --schema=backend/prisma/schema.prisma

echo '== Installing Playwright Chromium =='
npx playwright install --with-deps chromium

echo '== Setup complete =='
echo 'Database migrations are intentionally NOT run by setup. Run npm run db:deploy only against the isolated Codex/CI database.'
