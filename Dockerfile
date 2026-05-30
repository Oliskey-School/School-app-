# Multi-stage build for the Oliskey backend (Express + Prisma).
# The frontend is built and deployed separately to Vercel.
# Backend runs via tsx (no pre-compile step) to match the existing `npm start` script.

# ---------- Stage 1: install full deps + generate Prisma client ----------
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY backend/prisma ./backend/prisma

# Install everything including tsx (devDep) — we need it at runtime.
RUN npm ci --ignore-scripts && \
    npx prisma generate && \
    npx prisma generate --schema=backend/prisma/schema.prisma

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000 \
    BACKEND_PORT=5000

RUN apk add --no-cache libc6-compat openssl tini wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001

COPY --from=deps --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodeapp:nodejs /app/generated    ./generated
COPY --chown=nodeapp:nodejs prisma         ./prisma
COPY --chown=nodeapp:nodejs backend        ./backend
COPY --chown=nodeapp:nodejs package.json   ./

USER nodeapp
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "backend/src/server.ts"]
