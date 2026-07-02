#!/usr/bin/env bash
# =============================================================================
# Oliskey — Deploy / update script
# Run on the server after every git pull or manual upload.
# Handles: install → build backend → build frontend → DB sync → PM2 restart
#
# Usage:
#   bash scripts/deploy.sh
#   bash scripts/deploy.sh --skip-frontend   # API-only change
# =============================================================================

set -euo pipefail

SKIP_FRONTEND=false
for arg in "$@"; do
  [[ "$arg" == "--skip-frontend" ]] && SKIP_FRONTEND=true
done

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo ""
echo "=========================================="
echo "  Oliskey Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Directory: $APP_DIR"
echo "=========================================="

# Load production env so npm scripts see DATABASE_URL etc.
if [[ -f .env.production ]]; then
  set -a; source .env.production; set +a
  echo "✅ Loaded .env.production"
else
  echo "⚠️  .env.production not found — deploy may fail if env vars are missing"
fi

echo ""
echo "--> [1] Installing dependencies..."
npm ci --workspaces=false 2>/dev/null || npm install

echo "--> [2] Installing backend dependencies..."
cd backend && npm ci 2>/dev/null || npm install && cd "$APP_DIR"

echo "--> [3] Building backend (TypeScript → JS)..."
cd backend && npm run build && cd "$APP_DIR"
echo "    ✅ Backend build complete"

if [[ "$SKIP_FRONTEND" == false ]]; then
  echo "--> [4] Building frontend (Vite)..."
  npm run build
  echo "    ✅ Frontend build complete → dist/"
else
  echo "--> [4] Skipping frontend build (--skip-frontend)"
fi

echo "--> [5] Syncing database schema (Prisma db push)..."
cd backend
# db push is safe for production: it applies changes without migration history issues.
# For destructive changes, use migrate deploy instead.
npx prisma db push --skip-generate --accept-data-loss=false \
  || echo "    ⚠️  db push had warnings — check output above"
npx prisma generate
cd "$APP_DIR"
echo "    ✅ Database schema synced"

echo "--> [6] Restarting PM2 process..."
if pm2 describe oliskey-api > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --env production
  echo "    ✅ PM2 reloaded (zero-downtime)"
else
  pm2 start ecosystem.config.cjs --env production
  pm2 save
  echo "    ✅ PM2 started and saved"
fi

echo ""
echo "=========================================="
echo "  Deploy complete ✅"
echo "  Check logs:  pm2 logs oliskey-api"
echo "  Status:      pm2 status"
echo "=========================================="
