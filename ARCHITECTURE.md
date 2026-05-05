# 🏛️ Oliskey School App: Architecture & Infrastructure

This document provides a clear separation between the **Local Development** and **Production** environments to ensure consistency across the AI agent.

## 💻 Local Development Stack
*Optimized for speed, debugging, and isolation.*

- **Frontend**: 
    - **Host**: `localhost:3000` (Vite)
    - **API Endpoint**: `http://localhost:5000/api`
- **Backend**:
    - **Host**: `localhost:5000` (Node.js/Express)
    - **Persistence**: Local Prisma Client
- **Database**:
    - **Engine**: **Dockerized PostgreSQL**
    - **Connection**: `postgresql://postgres:password123@localhost:5432/school_app`
- **Real-time**:
    - **Provider**: Local Socket.io server.
- **Service Command**: `npm run start:all` (Starts both Frontend & Backend).
.env

---




## 🌐 Production Stack
*Optimized for scale, security, and high availability.*

**Latest Stable Version:** `0.5.38`

### Infrastructure Context
- **Frontend:** Vercel (Production)
- **Backend:** Railway (Production)
- **Database Engine:** Supabase Managed PostgreSQL
- **Connection:** Supabase Transaction Pooler (via `DATABASE_URL` in Railway).
- **Migrations:** Uses `DIRECT_URL` (Port 5432) for deployment stability.
- **Local DB:** Docker PostgreSQL (`localhost:5432`).

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
    .env.production 

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

### 1. Database Synchronization (Schema & Client)
Before pushing any code changes that involve database modifications, ensure the schema and clients are in sync:

#### **A. Push Schema to Database**
Sync your local or production database with the current Prisma schema:
- **Local**: `npm run db:push`
- **Production (Supabase)**: Ensure `DATABASE_URL` is set to Supabase, then run:
  ```bash
  npx prisma db push --schema=prisma/schema.prisma
  npx prisma db push --schema=backend/prisma/schema.prisma
  ```

#### **B. Regenerate Prisma Clients**
Always regenerate both the root and backend clients after a schema change to avoid type mismatches:
```bash
npx prisma generate
npx prisma generate --schema=backend/prisma/schema.prisma
```

#### **C. Sync Platform Version**
If updating the system version, run the synchronization script to update the demo school record:
```bash
    npx tsx scripts/update_demo_version.ts
```





### 2. Vercel Build
The `vercel-build` script in `package.json` ensures the Prisma Client is generated synchronously during the Vercel deployment pipeline.

### 3. Railway Sync
The master backend on Railway must have its `DATABASE_URL` pointed to the Supabase connection pooler.

### 4. Version Update Policy
When pushing to production:
1.  **Semantic Versioning**: Increment the `version` in `package.json`.
2.  **PWA Refresh**: The `UpdatePrompt` component detects the new version via the Service Worker.
3.  **User Notification**: Mobile/Web users are prompted with a banner to "Update Now" or "Cancel".
4.  **Activation**: Clicking "Update" triggers a Service Worker skip-waiting and a hard reload to ensure zero-stale-code sessions.

---
*Last Updated: April 2026*
