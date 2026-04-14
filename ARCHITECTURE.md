# 🏛️ Oliskey School App: Architecture & Infrastructure

This document provides a clear separation between the **Local Development** and **Production** environments to ensure consistency across the team.

## 💻 Local Development Stack
*Optimized for speed, debugging, and isolation.*

- **Frontend**: 
    - **Host**: `localhost:5173` (Vite)
    - **API Endpoint**: `http://localhost:5000/api`
- **Backend**:
    - **Host**: `localhost:5000` (Node.js/Express)
    - **Persistence**: Local Prisma Client
- **Database**:
    - **Engine**: **Dockerized PostgreSQL**
    - **Connection**: `postgresql://postgres:postgres@localhost:5432/school_db`
- **Real-time**:
    - **Provider**: Local Socket.io server.
- **Service Command**: `npm run start:all` (Starts both Frontend & Backend).

---

## 🌐 Production Stack
*Optimized for scale, security, and high availability.*

- **Frontend**:
    - **Host**: **Vercel** (`school-app-oliskeylee.vercel.app`)
    - **CDN**: Vercel Edge Network.
- **Backend (Hybrid)**:
    - **Core Server**: **Railway** (Persistent Express instance).
    - **Edge Proxy**: **Vercel Serverless Functions** (`api/[...path].ts`) - handles initial routing and latency reduction.
- **Database**:
    - **Engine**: **Supabase Managed PostgreSQL**
    - **Connection**: Supabase Transaction Pooler (via `DATABASE_URL` in Railway).
- **Real-time**:
    - **Provider**: Socket.io (hosted on the Railway persistent instance).
- **Authentication**:
    - **Provider**: Supabase Identity Services (Cloud-managed).

---

## 🔄 Data Architecture & Flow

### 📦 Persistence Strategy
The application utilizes an **Offline-First** model:
1.  **Browser Storage**: Acts as a primary read cache.
2.  **Sync Engine**: A custom logic layer that reconciles local state with the backend.
3.  **Real-time Push**: WebSocket events from the backend trigger background re-hydration of the local cache.

### 🛣️ Routing Logic
Requests flow from the user's browser through Vercel's edge, where the catch-all function at `/api` determines the best route to the Railway backend, ensuring maximum uptime even during core-server restarts.

## 🛠️ Deployment Workflow

### 1. Schema Updates
Always run `npx prisma db push` targeting the production database (Supabase) before pushing code changes that alter the data model.

### 2. Vercel Build
The `vercel-build` script in `package.json` ensures the Prisma Client is generated synchronously during the Vercel deployment pipeline.

### 3. Railway Sync
The master backend on Railway must have its `DATABASE_URL` pointed to the Supabase connection pooler to avoid port 5432 connection limits.

---
*Last Updated: April 2026*
