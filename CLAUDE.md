# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ CRITICAL: BEFORE STARTING ANY TASK — ASK CLARIFYING QUESTIONS

Before writing a single line of code for any request, Claude must **always ask the owner clarifying questions** to fully understand what is needed.

### Why this is required:
The owner's first message may be brief or high-level. Claude must never assume it knows exactly what is wanted. Asking questions first prevents wasted work, wrong implementations, and unwanted changes.

### How Claude must ask questions:
- Ask **all questions in one message** — not one at a time across multiple turns
- Questions must be **specific and practical**: "Should this work for all branches or just the main branch?", "Should the teacher see this before or after submitting?"
- Do not ask vague questions like "Can you tell me more?" — ask targeted questions about behavior, scope, edge cases, and user roles affected
- After the owner answers, Claude may ask **one follow-up round** if something is still genuinely unclear — then proceed
- Claude must **never start coding** before getting at least a basic confirmation of the plan

### Example format Claude must use:
> "Before I start, I have a few questions to make sure I build this correctly:
> 1. [Question about scope]
> 2. [Question about which roles are affected]
> 3. [Question about edge case or behavior]
> Please answer these and I'll get started."

---

## ⚠️ CRITICAL: AFTER FINISHING CODE — EXPLAIN HOW IT WORKS, NOTHING ELSE

When Claude finishes writing or updating code, it must explain **how the feature works from the user's perspective only**.

### Rules for the post-code explanation:
- Explain **what the user will see and experience** — what happens when they click, submit, navigate, or interact
- Explain **the flow**: what triggers what, in plain everyday language
- Do NOT mention technology names — no React, Supabase, TypeScript, Express, RLS, hooks, queries, middleware, components, or any technical term
- Do NOT explain why a technology was chosen or how it works internally
- Do NOT list file names, function names, or code structure
- Keep it **short and conversational** — 3 to 8 sentences is usually enough
- Write as if explaining to a non-technical school owner who just wants to know: "What does this do and how do I use it?"

### Example of what Claude must NOT write:
> "I updated the `StudentService.ts` to use a Supabase RLS-scoped query with a React `useEffect` hook that triggers on branch context change..."

### Example of what Claude MUST write:
> "When a teacher opens the attendance page, they will only see students from their assigned class. After marking attendance and clicking Save, the record is immediately saved and the admin can see it from their dashboard. If the teacher tries to mark attendance for a date that already has a record, they will see a warning before overwriting it."

---

## ⚠️ CRITICAL: TEST THE CODE BEFORE GIVING ANY FEEDBACK

After writing or updating any code, Claude must **always test it first** before reporting back to the owner. Claude must never say "this should work" or "it's done" without running a real check.

### What Claude must do after writing code:

1. **Run the relevant tests** — if a test file exists for the feature, run it. If no test exists, Claude must write a basic test for the new code and run it
2. **Check for build errors** — run `npm run build` or the relevant compile check to confirm there are no TypeScript or build errors
3. **Check for runtime errors** — if the change touches a server route or backend service, start the server and confirm it starts without crashing
4. **Fix any failures silently** — if a test fails or an error is found, Claude must fix it and re-test before saying anything to the owner. The owner should never hear about a problem that Claude can fix itself
5. **Only report back after everything passes** — Claude's final message must only come after all tests and checks are green

### What Claude must include at the end (after all tests pass):
> "I tested this and everything is working. Here is how it works: [plain language explanation — no tech terms]"

### What Claude must NEVER do:
- Say "done" or "here is the code" without testing first
- Ask the owner to test it themselves as the first step
- Mention test results, file names, or error logs in the final explanation — just confirm it works and explain the behaviour
- Skip testing because the change seems "small" or "obvious" — every change must be tested, no exceptions

---

## ⚠️ CRITICAL: UI PRESERVATION POLICY — READ FIRST

**Claude must NEVER modify the UI without explicit owner approval.**

This rule applies to every task — bug fixes, new features, backend changes, refactors, database updates, and everything else. It is non-negotiable and overrides all other instructions.

### What Claude must NEVER change without being explicitly told to:
- Layout, spacing, padding, margins, or positioning of any element
- Colors, gradients, themes, or color schemes
- Typography — fonts, font sizes, font weights, line heights
- Component structure or hierarchy (e.g. moving a card, reordering sections)
- Icons, images, illustrations, or visual assets
- Animations, transitions, or motion effects
- Button styles, input styles, or form appearances
- Navigation structure, sidebar, topbar, or tab layouts
- Modal, drawer, or overlay designs
- Responsive breakpoints or mobile layouts
- Any Tailwind classes, CSS, or inline styles that affect appearance

### What Claude IS allowed to do (without UI approval):
- Fix bugs in logic, data fetching, or state management — **without touching any styling**
- Add backend routes, controllers, or services
- Update database queries or Supabase logic
- Add new functionality — but only by **inserting new components** that match the existing design system exactly, never by altering existing ones
- Refactor TypeScript types or utility functions
- Write or update tests

### When Claude wants to suggest a UI improvement:
Claude must **stop and ask** before making any change. The exact format is:

> "I noticed [X]. Would you like me to update the UI for this? I will not make any changes until you confirm."

Claude must describe exactly what it intends to change and wait for a **clear "yes, go ahead"** from the owner before touching a single style, class, or layout property.

### If a task requires a UI change to be completed:
Claude must inform the owner:

> "This feature requires a UI change to [specific area]. Here is what I would change: [description]. Please confirm before I proceed."

Claude does not proceed until confirmed. Claude does not make "small" or "minor" UI tweaks on its own judgment — all UI changes require consent, no matter how trivial they seem.

---

## Project Overview

**Oliskey School Management System** - A multi-tenant SaaS platform for Nigerian schools. It is a PWA (Progressive Web App) with offline-first capabilities, supporting multiple user roles across a React frontend and an Express backend, both connected to Supabase.

---

## Product Vision (Owner-Confirmed)

### Refined Vision Statement

> "I am building a multi-tenant School Management System with a hierarchical branch structure. I need a robust architecture where a 'School Owner' can enter a 'Try Demo' environment that fully simulates the live app. In this demo, they must be able to perform Admin tasks and see those changes reflected in real-time when switching to Teacher, Student, or Parent roles within that same demo instance."

### Four Non-Negotiable Core Requirements

These are the owner's confirmed pillars. Every decision Claude makes — architecture, database design, feature logic, security rules — must serve and protect these four requirements:

**1. Strict Isolation**
School A must never access School B's data. This is absolute. No shared queries, no cross-school lookups, no exceptions. Every single database table is scoped by `school_id` and all security rules enforce this at the data layer — not just the application layer.

**2. Branch Hierarchy**
Within a single school, the Main Branch and all Sub-Branches have isolated data environments. A branch admin sees only their branch. A main branch admin sees all branches within their school. Teachers and parents follow their assignment — they see only the branches their students/children belong to.

**3. Standardized Identity — The Global ID Format**
Every user across the entire platform must have one unified ID in this exact format:
```
{SCHOOL_CODE}_{BRANCH_CODE}_{ROLE_CODE}_{NUMBER}
```
Example: `SCH01_BR02_TCH_005` — Teacher #5 in Branch 2 of School 01.

This ID is the **primary identifier** used everywhere: in the database, across all API calls, displayed in the UI, and referenced in every feature. It is never a raw UUID. It is stored in `school_generated_id` and is always generated automatically by the backend the moment a user is created.

**4. Conversion Flow — Demo to Live**
After a school owner tests the platform using demo data, they must be able to smoothly transition into creating a real live account with their own school data. The demo experience must feel identical to the live product so the owner knows exactly what they are signing up for.

---

### Claude's Standing Architecture Audit Instruction

Whenever Claude is working on any feature, database change, or API update, it must:

1. **Use the MCP server to audit the relevant code** before proposing any solution
2. **Verify the current schema and security rules** support the `School_Branch_Role_Number` ID structure and branch-level isolation
3. **Propose a plan first** — describing what will change in the data structure and security rules — and wait for owner approval before writing any code
4. **Flag any gaps** found during the audit where the current code does not yet fully implement one of the four core requirements above

---

### Core Purpose
A school owner visits the Oliskey platform, tries the fully interactive demo, sees the product working end-to-end across all roles, and then creates a real account for their school — each school getting a completely isolated, independent space on the platform.

### Demo Mode (Try Before You Sign Up)
- Any visitor can click "Try Demo" and immediately enter a fully working demo school environment
- The demo is **fully interactive**: the visitor can create students, mark attendance, enter grades, publish notices, assign classes — all real actions on real demo data
- All four roles share the **same demo school** and **same Supabase realtime subscriptions**: an action by the demo Admin is immediately visible when the visitor switches to the Teacher, Student, or Parent role — no logout needed
- A **floating role-switcher pill** is always visible in demo mode: the visitor switches roles with one tap without re-authenticating
- The demo school data **auto-resets every 24 hours** to a clean baseline state so it is always presentable for new visitors
- The demo school ID is `d0ff3e95-9b4c-4c12-989c-e5640d3cacd1` (Oliskey Demo School, branch `7601cbea-e1ba-49d6-b59b-412a584cb94f`)

### School Onboarding (Creating a Real Account)
- After the demo a clear CTA "Create Your School" launches a 5-step wizard
- Step 1: School info — name, address, state, phone, email, and the owner **types their own school code** (e.g. "EXCEL") — this becomes the prefix for all IDs in that school
- Step 2: Branch setup — first branch is always "Main Branch". Owner types the branch code (e.g. "MAIN"). More branches can be added, each with a unique code
- Step 3: Owner admin account — full name, email, password — this becomes the school Admin/Proprietor
- Step 4: Plan selection — all schools start on a **30-day free trial**, then choose Free / Basic / Premium / Enterprise
- Step 5: Review and Launch
- Every new school starts completely **empty** (no sample or demo data)
- The backend endpoint `POST /api/schools/onboard` creates the school, branch, and owner user in one transaction and returns the first generated ID

### Multi-Tenancy & Isolation Rules
- Every school is completely isolated: School A can never see School B data — enforced by `school_id` scoping on every DB table and Supabase RLS
- Within a school, branch isolation is enforced: Branch A admin cannot see Branch B data
- **Main branch admin** (school-level admin) can see and manage **all branches** within their school
- **Branch admin** can only see their own branch
- **Teacher**: If assigned to multiple branches, they see data from all their assigned branches
- **Parent**: If their children are enrolled in different branches, they see all their children regardless of branch
- **Super Admin** (Oliskey platform owner): Can log in and see all schools across the platform for support purposes

### Standard User ID Format
Every user in every school gets a single, unified ID that follows this exact format:

```
{SCHOOL_CODE}_{BRANCH_CODE}_{ROLE_CODE}_{NUMBER}
```

Examples:
- `EXCEL_MAIN_STU_0001` — Student #1 in Main Branch of Excellence Academy
- `EXCEL_BRN2_TCH_0004` — Teacher #4 in Branch 2
- `EXCEL_MAIN_ADM_0001` — Admin #1 in Main Branch

**Role codes (canonical, used in both frontend and backend):**
| Role | Code |
|---|---|
| Student | STU |
| Teacher | TCH |
| Parent | PAR |
| Admin | ADM |
| Super Admin | SADM |
| Proprietor | PRO |
| Inspector | INS |
| Exam Officer | EXM |
| Compliance Officer | CMP |
| Counselor | CNS |

**ID rules:**
- The school code comes from what the **owner types** at setup (not auto-generated)
- The branch code comes from what the **owner types** when creating a branch
- The number **restarts from 0001 per branch per role** (Main Branch has its own STU_0001, Branch 2 also has its own STU_0001)
- There is ONE unified field for this ID everywhere: `school_generated_id` — stored in the role-specific table (`students`, `teachers`, `parents`) AND mirrored in the `users` table (replacing the old `custom_id` and `staff_id` fields which are being unified)
- The ID is generated **automatically by the backend** at the moment a user is created — never null, never a UUID shown to users

### Plans & Trial
- All new schools get a **30-day free trial** on signup (subscription_status = 'trial')
- After trial: Free (≤50 students) / Basic / Premium / Enterprise
- The `schools` table `plan_type` and `subscription_status` fields control feature gates

---

## Commands

### Development

```bash
# Install dependencies
npm run setup

# Run everything (frontend + backend) concurrently
npm run start:all

# Frontend only (Vite dev server on port 3000)
npm run dev

# Backend only (Express server on port 5000, with hot-reload)
npm run server
```

### Build & Preview

```bash
npm run build
npm run preview
```

### Testing

```bash
# Frontend unit tests (Vitest, watch mode)
npm test

# Frontend unit tests (single run)
npm run test:run

# Run a specific test file
npx vitest run components/admin/__tests__/StudentListScreen.test.tsx

# Backend integration tests (uses supertest)
npx tsx --tsconfig backend/tsconfig.json node_modules/.bin/vitest run backend/tests/integration/student.test.ts
```

### Database

```bash
# Push Supabase migrations
npm run db:migrate
```

## Environment Setup

Two separate `.env` files are required:

**Root `.env`** (frontend, Vite):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=       # For AI features
VITE_PAYSTACK_PUBLIC_KEY=  # For payments
VITE_FLUTTERWAVE_PUBLIC_KEY=
VITE_RESEND_API_KEY=
VITE_APP_NAME=
```

**`backend/.env`** (Express server):
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=      # Service role key (not anon key)
JWT_SECRET=
BACKEND_PORT=5000
```

## Architecture

### Dual-Process Architecture

The app runs as two separate processes:
1. **Frontend**: Vite + React SPA on port 3000. Proxies `/api/*` to `http://localhost:5000`.
2. **Backend**: Express server on port 5000 (`backend/src/server.ts`).

The frontend uses a **hybrid API client** (`lib/api.ts` → `HybridApiClient`) that can either call Supabase directly (RLS enforced) or go through the Express backend. Most data access uses Supabase directly from the frontend.

### Multi-Tenant Data Model

Every record is scoped by `school_id` and often `branch_id`. Schools can have multiple branches. Supabase RLS policies enforce tenant isolation. The demo school ID is `d0ff3e95-9b4c-4c12-989c-e5640d3cacd1`.

### User Roles & Routing

Roles are defined in `types.ts` as `DashboardType` enum:
`admin`, `superadmin`, `teacher`, `parent`, `student`, `proprietor`, `inspector`, `examofficer`, `complianceofficer`, `counselor`

`AuthContext` (`context/AuthContext.tsx`) reads the role from `app_metadata.role` in the Supabase JWT. `DashboardRouter` (`components/DashboardRouter.tsx`) lazy-loads the correct dashboard component for each role.

### Authentication Flow

- Real users: Supabase Auth with PKCE flow. Sessions stored in `sessionStorage` with tab-specific keys to prevent cross-tab sync.
- Demo users: Identified by email domain (`@demo.com`, `@school.com`) or `is_demo` metadata. Demo tokens (`demo-auth-token-{role}`) bypass JWT verification in the backend middleware (`backend/src/middleware/auth.middleware.ts`).
- The backend middleware tries local JWT first, then Supabase's `auth.getUser()` for real tokens.

### Frontend Structure

```
App.tsx                    # Root: offline init, service worker, PWA setup
context/
  AuthContext.tsx           # Auth state, role detection, school context
  BranchContext.tsx         # Active branch state
  ProfileContext.tsx        # User profile data
components/
  DashboardRouter.tsx       # Role-based routing after login
  admin/                    # Admin & SuperAdmin screens
  teacher/                  # Teacher screens
  student/                  # Student screens
  parent/                   # Parent screens
  auth/                     # Login, Signup, AuthCallback
  shared/                   # Cross-role shared screens
  ui/                       # Generic UI primitives
lib/
  supabase.ts               # Supabase client (tab-specific session storage)
  api.ts                    # HybridApiClient (Supabase + Express)
  database.ts               # Supabase query helpers
  apiHelpers.ts             # Shared fetch utilities, isDemoMode(), getAuthToken()
```

### Backend Structure

```
backend/src/
  app.ts                    # Express app setup (helmet, rate-limit, CORS, routes)
  server.ts                 # Entry point
  config/env.ts             # Env vars with validation
  middleware/auth.middleware.ts  # JWT + Supabase token verification
  routes/index.ts           # Mounts all route modules under /api
  routes/*.routes.ts        # Route definitions per domain
  controllers/*.controller.ts  # Request handlers
  services/*.service.ts     # Business logic (Supabase queries)
```

### Database Migrations

SQL migrations are in two locations:
- `supabase/migrations/` — Supabase CLI managed migrations (run with `npm run db:migrate`)
- `supabase/sql_scripts/` — Ad-hoc scripts run manually in the Supabase SQL Editor

### Offline-First Features

On startup (`App.tsx`), the app runs `runMigrations()` (IndexedDB schema), registers a service worker, and initializes `syncEngine` and `cacheCleanupScheduler`. The service worker caches Supabase API responses using a NetworkFirst strategy.

### Payments

Two payment integrations: Paystack (`react-paystack`, `VITE_PAYSTACK_PUBLIC_KEY`) and Flutterwave (`components/payments/FlutterwaveWrapper.tsx`, `VITE_FLUTTERWAVE_PUBLIC_KEY`). Both are wrapped in `services/PaymentService.ts`.

### AI Features

Google Gemini is used for AI features (`lib/ai.ts`, `@google/generative-ai`). The API key is exposed via `VITE_GEMINI_API_KEY` / `process.env.GEMINI_API_KEY` (bridged in `vite.config.mts`).