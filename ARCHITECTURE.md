# Project Architecture & Deployment Procedure

This document outlines the standard architecture and deployment procedures for the Oliskey School App. All AI agents and developers should follow these guidelines.

## 🏗️ System Architecture

### 🌐 Frontend
- **Framework**: React (Vite)
- **Primary Domain**: Vercel (`school-app-oliskeylee.vercel.app`)
- **Key Features**: Offline-first, PWA, Real-time sync.

### ⚙️ Backend
- **Framework**: Express.js (Node.js)
- **Production Host**: Railway
- **Vercel Bridge**: A catch-all serverless function at `api/[...path].ts` on Vercel serves as a proxy/fallback.

### 📊 Database
- **Provider**: PostgreSQL
- **Development**: Dockerized Local PostgreSQL
- **Production**: Supabase (Connection Pooling via port 6543)
- **ORM**: Prisma

## 🛠️ Development Workflow

### 1. Local Environment
- **Start Backend**: `cd backend && npm run dev` (Connects to Docker DB)
- **Start Frontend**: `npm run dev` (Vite)
- **Schema Changes**: `npx prisma db push` followed by `npx prisma generate`

### 2. Production Deployment
- **Database Migrations**: Always run `npx prisma db push` or `npx prisma migrate deploy` targeting the Supabase production URL before deploying code changes.
- **Backend (Railway)**: Ensure `DATABASE_URL` is set to the Supabase pooler URL.
- **Frontend (Vercel)**:
    - Ensure `npx prisma generate` is run during build (via `vercel-build` script).
    - API requests should target the `/api` route.

## 🛡️ Security & Environment
- **Sensitive Data**: Store in `.env` (Local) and `.env.production` (Deployment reference).
- **CORS**: Backend allows `localhost` and the production Vercel domain.
