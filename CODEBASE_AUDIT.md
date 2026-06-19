# Oliskey School App — Full Codebase Audit

**Date:** 2026-05-27
**Auditor:** Claude (Opus 4.7, 1M context) with 5 parallel Explore subagents
**Scope:** 8 phases — structure, pages, features, backend/DB, auth, state/data, gaps, summary
**Tone:** Brutally honest — pre-launch readiness signal
**Sources read:** `admin_audit_progress.md`, `FINAL_FEATURES_AUDIT.md`, `admin_integration_report.md`, `MULTITENANT_IMPLEMENTATION_SUMMARY.md`, `ARCHITECTURE.md`, `CODEBASE_STRUCTURE.md`, `App.tsx`, `package.json` + parallel deep-reads across `backend/`, `components/`, `lib/`, `context/`, `supabase/`, `prisma/`.

---

## PHASE 8 — EXECUTIVE SUMMARY (READ THIS FIRST)

### Overall Launch Readiness: ~62%

Not ready for paid customers without addressing the BLOCKERS in Section 9.

| Dimension | Score | One-line verdict |
|---|---|---|
| Frontend feature breadth | 85% | Massive surface area, ~260 unique screens across 10 roles |
| Frontend wiring to real APIs | 75% | Most screens wired; pockets of hardcoded mock data remain |
| Backend API coverage | 90% | 65 route files, ~300+ endpoints — comprehensive |
| Database schema | 95% | 196 tables, well-modeled, multi-tenant fields present |
| Database security (RLS) | **49%** | **99 of 196 tables have NO RLS** — relies on app-level filters only |
| Authentication architecture | 80% | JWT auth is sound; algorithm locked to HS256 |
| RBAC enforcement | **55%** | Many admin-hub routes lack `requireRole`; email verification disabled |
| Multi-tenant isolation | 70% | Framework is built; backend services not fully migrated to use it |
| Test coverage | **15%** | 10 component tests, ZERO backend tests, no E2E green |
| Production hygiene | 50% | Demo school ID hardcoded as fallback in production code paths |

### Per-Dashboard Completion (Honest)

| Dashboard | Screens | Wired | Stub/Mock | Verdict |
|---|---|---|---|---|
| **Admin** | 80+ | ~70 | 5-10 | **87%** — strong, ship-able after gaps closed |
| **SuperAdmin** | 12 | 12 | 0 | **95%** — most complete role |
| **Teacher** | 60+ | ~52 | 5-8 | **83%** — strong |
| **Student** | 40 + 15 games | ~50 | 5 (Adventure mode partial) | **88%** |
| **Parent** | 28+ | ~25 | 3 | **86%** |
| **Inspector** | 19 | 15 | 4 | **75%** — workable |
| **Proprietor** | 7 | 4 (subcomponents) | **Top-level dashboard hardcoded** | **40%** — fake KPIs |
| **ComplianceOfficer** | 2 | 2 partial | 0 | **30%** — skeleton only |
| **Counselor** | 1 | 0 | 1 placeholder | **5%** — DOES NOT FUNCTION |
| **ExamOfficer** | 1 | 0 | 1 placeholder | **5%** — DOES NOT FUNCTION |

---

## PHASE 1 — STRUCTURE & TECH STACK

### Tech Stack (Confirmed from `package.json`)

**Frontend:** React 18.3, Vite 6.2, TypeScript 5.8, TailwindCSS 3.4, TanStack Query 5.90, React Router 7.13 (installed but not used — app is hash-based), React Native 0.76 + Expo 54 + Capacitor 8 (mobile shells), NativeWind 4.2, Framer Motion 12, Recharts 3, Formik + Yup, Zod 4
**Backend:** Express 5.1, Node + tsx, Prisma 5.22, Socket.io 4.8, BullMQ + ioredis (queues), Helmet, express-rate-limit, csrf-csrf, JWT (jsonwebtoken 9), bcryptjs, multer, nodemailer, otplib (2FA)
**Database:** self-hosted PostgreSQL (production), Dockerized Postgres (local dev)
**AI:** `@google/genai` + `@google/generative-ai` (Gemini)
**Payments:** Paystack, Flutterwave
**Offline:** Dexie (IndexedDB), service worker via `vite-plugin-pwa`
**Realtime:** Socket.io + Socket.io channels
**Testing:** Vitest 4, Playwright 1.58, supertest 7
**Deploy:** nginx (self-hosted) (frontend), the self-hosted server (backend), the backend database (DB)

### Folder Map (top-level, with purpose)

```
school-app-/
├── App.tsx, index.tsx                 # SPA entry — hash-based routing
├── components/                        # 1000+ UI files, split by role
│   ├── admin/         (146 files)
│   ├── teacher/       (77 files)
│   ├── student/       (32 + games + cbt + adventure)
│   ├── parent/        (30 files)
│   ├── proprietor/    (7 files)
│   ├── inspector/     (27 files)
│   ├── auth/          (Login, Signup, AuthCallback, InviteAccept...)
│   ├── shared/        (50+ cross-role: chat, calendar, timetable...)
│   └── ui/            (20+ primitives)
├── pages/                             # Minimal — mostly auth landing pages
├── context/  (5 files)                # AuthContext, BranchContext, ProfileContext, GamificationContext, SocketContext
├── contexts/ (1 file)                 # SaaSContext — DUPLICATE FOLDER, should merge
├── hooks/    (20 files)               # Realtime, offline, optimistic, tenant limit
├── services/ (12 files)               # Frontend API wrappers
├── lib/      (60+ files)              # api.ts (126KB monolith), api.ts, mockAuth.ts,
│                                      # offlineDatabase, syncEngine, cacheManager, ai.ts
├── backend/
│   ├── src/
│   │   ├── app.ts, server.ts          # Express bootstrap
│   │   ├── routes/    (65 files)
│   │   ├── controllers/(53 files)
│   │   ├── services/  (60+ files)
│   │   ├── middleware/                # auth, tenant, plan, csrf, security
│   │   ├── utils/                     # branchScope, queryScope
│   │   └── config/env.ts
│   ├── prisma/                        # Backend Prisma schema
│   └── tests/                         # Backend integration tests (folder exists, mostly empty)
├── prisma/                            # ROOT Prisma schema (duplicate of backend/prisma/)
├── supabase/
│   ├── migrations/                    # CLI-managed migrations
│   ├── sql_scripts/                   # Ad-hoc SQL
│   └── (functions/, seed/)
├── types/                             # types/index.ts (29KB), inspector.ts (4KB)
├── types-additional.ts, types-saas.ts # Loose root type files
├── utils/, scripts/, config/          # Utility helpers, kill-ports, deploy
├── android/, ios/, .expo/             # Mobile shells (Capacitor + Expo)
├── public/, styles/, data/, generated/, prisma/, init-db/
└── 25+ root *.md and *.sql files      # Doc sprawl
```

### Structural Oddities Found

| Issue | Detail | Severity |
|---|---|---|
| `context/` vs `contexts/` | Two folders, plural one has only `SaaSContext.tsx` | Medium |
| Prisma schema in 2-3 places | `prisma/schema.prisma`, `backend/prisma/schema.prisma`, `ddl.sql` | High (drift risk) |
| `lib/api.ts` is **126 KB monolith** | All 300+ endpoint wrappers in one file | High (merge conflicts, tree-shaking) |
| Orphan folders | `apps/`, `packages/`, `school-auth-system/`, `brain/`, `owner/`, `api_deprecated_vercel/` | Medium |
| 25+ root .md and .sql files | Doc/script sprawl mixed with code | Low |
| `database_backup.sql` in repo | 11.5 MB — likely should be gitignored | Medium |
| `data/`, `data.ts`, `constants.tsx` (73 KB) | Lots of seed/mock data in production bundle | Medium |
| Both Capacitor AND Expo | Two mobile shells; unclear which is primary | Medium |

---

## PHASE 2 — PAGES, ROUTES, & ROLES

The app does **NOT** use react-router despite the dependency. It's a **hash-based SPA**: `App.tsx` → `DashboardRouter` switches on `role` → each dashboard manages its own internal screen state via hash fragments or local `currentView` state.

### Routing Architecture

```
App.tsx
├── if hash includes '/invite/accept' → InviteAcceptScreen
├── if hash includes 'access_token' or '/auth/callback' → AuthCallback
├── if !user → Login | Signup | CreateSchoolSignup
└── if user + role → DashboardRouter
                    └── switch(role) →
                        ├── Admin → VerifiedAdminRoute → AdminDashboard
                        ├── SuperAdmin → SuperAdminDashboard
                        ├── Teacher → TeacherDashboard
                        ├── Student → StudentDashboard
                        ├── Parent → ParentDashboard
                        ├── Proprietor → ProprietorDashboard      (no hash routing!)
                        ├── Inspector → InspectorDashboard
                        ├── ExamOfficer → ExamOfficerDashboard    (placeholder)
                        ├── ComplianceOfficer → ComplianceOfficerDashboard
                        └── Counselor → CounselorDashboard        (placeholder)
```

### Screen Inventory by Role (Honest Status)

#### ADMIN — 80+ screens, mostly complete

Operational (from `admin_audit_progress.md` + verification): Overview, Analytics, Reports, Class List, Student List, Add Student, Teacher List, Teacher Performance, Timetable (4 variants), Fee Management, Exam Management, Report Card Publishing, User Roles, Audit Log, Profile Settings, Communication Hub, System/Academic/Financial Settings, Conference Scheduling, Payroll Dashboard.

Pending (~50 marked as pending in prior audit, many actually exist as files but unverified for E2E): student/teacher detail views, parent management, scholarship, sponsorship, hostel, transport, ID cards, governance hub, branch admin tools, late arrival, salary configuration, payslip generator, custom report builder, backup/restore.

**Honest read:** Admin is the most built-out role. The "Pending" list mixes "not built" with "not yet E2E-tested." Most files exist; many are not verified against real data.

#### TEACHER — 60+ screens

Strong: Overview, Class Detail, Assignments (Create/List/Submissions), Grading (entry, submission, gradebook), Report Cards, Attendance (self + students), Lesson Planner + Notes, Exams + Quizzes + CBT, Virtual Classroom, Messages, Forum, PD Courses, Performance Analytics, Appointments, Leave Requests, Payslip Viewer, Resource Sharing, Photo Gallery, Settings.

Partial: Badge System, Mentoring Matching, AI Game Creator, Educational Games (curation only).

#### STUDENT — 40 + 15 games + adventure mode + CBT

Strong: Dashboard, Assignments, Classes, Attendance, Results, Quizzes, Subjects, Extracurriculars, Finance, Achievements, Calendar, Timetable, Library, Messaging, Chat, Notifications, 3 Profile variants, CBT exams.

Games (all functional standalone): Math Sprint, GeoGuesser, Code Challenge, Math Battle Arena, Peekaboo Letters, Counting Shapes, Simon Says, Alphabet Fishing, Bean Bag Toss, Red Light Green Light, Spelling Sparkle, Vocabulary Adventure/Ninja/Pictionary, Virtual Science Lab, Physics Lab, Stock Market, Debate Dash, Geometry Jeopardy, Shark Tank, Simple Machine Hunt, Historical Hot Seat, CBT Exam Game.

Partial: Adventure Mode (Home/Loading/Quiz/Results screens placeholder), Study Buddy.

#### PARENT — 28+ screens

Strong: Unified Home, Child Selection, Report Cards, Fee Status + Installment + Piggy Bank, Attendance, Alerts, Messages, Appointments, Feedback, Learning Resources, School Policies, PTA, Volunteering, Permission Slips, Photo Gallery, Profile, Settings, Smart Calendar, Today Widget.

Partial: AI Parenting Tips, School Utilities.

#### PROPRIETOR — 7 screens, top-level is fake

**ProprietorDashboard.tsx renders hardcoded mock stats** (`totalRevenue: 15500000`, `totalStudents: 450`, etc. — see `components/proprietor/ProprietorDashboard.tsx:44-51`). Sub-components (FinancialOverview, ComplianceTracker, AcademicStandards, STEMLabManager, PeopleOverview) are wired, but the dashboard itself is a stub. Also lacks hash-based routing — uses inline `currentView` state, breaking browser back/forward.

#### INSPECTOR — 19 screens

Strong workflow: Dashboard, School Search/Profile/Directory, New Inspection, Checklist, Form Engine, Photo Capture, Signature Pad, GAPS/WSE Scoring, PDF Report Generator, Summary View.

Partial: Inspection workflow navigation (uses ViewStack pattern), Type Selector dialog.

#### SUPERADMIN — 12 screens (the most complete role)

Overview, School Management, Plan Management, Subscription, Payment Dashboard, Analytics, Notification Center, Audit Log Viewer, Role Management, Security Settings, Payment Gateway Settings, Profile.

#### EXAMOFFICER — 1 screen, ~100 lines, hardcoded stats. NOT FUNCTIONAL.

#### COUNSELOR — 1 screen, ~200 lines, hardcoded appointments. NOT FUNCTIONAL.

#### COMPLIANCEOFFICER — 2 screens, basic structure only.

---

## PHASE 3 — FEATURES PER DASHBOARD (Data Wiring)

### Wiring Pattern (Standard)

Component → `useQuery` (TanStack) → `api.XYZ()` in `lib/api.ts` → fetch backend → controller → service → Prisma → Postgres.

Some screens go directly to the database via `lib/api.ts` (RLS-enforced), others route through Express. The hybrid is in `lib/api.ts` (`HybridApiClient`).

### Real-Time

`SocketContext` connects to Socket.io on the self-hosted backend. `useRealtimeSync()` initializes subscriptions for school/branch. Used for chat, notifications, dashboard refresh, fee updates.

### Offline-First

`useOfflineQuery` wraps TanStack Query; reads IndexedDB first, falls back to network. `syncEngine` reconciles local writes when reconnected. Service worker caches API responses (NetworkFirst).

### Known Stub/Mocked Features

| Location | Issue |
|---|---|
| `components/proprietor/ProprietorDashboard.tsx:44-51` | Hardcoded revenue/expenses/students/teachers/fees |
| `components/proprietor/PeopleOverview.tsx:79,85,91` | Hardcoded `attendance: '94%'`, `presence: '100%'`, `debtFree: '80%'` |
| `components/student/StudentMessagesScreen.tsx:107-108` | `// TODO: Implement unread count` — always returns false |
| `components/admin/TeacherAttendanceScreen.tsx:94` | `// TODO: Implement direct admin override` |
| `components/student/cbt/StudentCBTListScreen.tsx:108` | `// TODO: Implement result check against separate table` |
| `CounselorDashboard.tsx` | 3 hardcoded appointments, 4 hardcoded stats |
| `ExamOfficerDashboard.tsx` | 4 hardcoded stat values |

---

## PHASE 4 — BACKEND & DATABASE

### API Endpoints — 65 route files, ~300+ endpoints

Routes cover: auth (20+), users, schools, branches, students (24), teachers (20), parents (16), classes/subjects/curricula (18), assignments (9), exams/quizzes (14), attendance (4), report cards (4), fees/payments/payroll (20), notifications/chat (16), virtual classes (3), extracurriculars (10), health/behavior/counseling (10), facilities/transport (25), calendar (6), admin-hub/governance/audit (25), analytics (8), AI/media/resources (15), and ~30 misc.

**Verdict:** Endpoint coverage is comprehensive. Frontend-to-backend mapping is essentially 100% — no broken API calls found.

### Database Schema — 196 tables

Three schema sources of truth (drift risk):
1. `prisma/schema.prisma` (root)
2. `backend/prisma/schema.prisma`
3. `ddl.sql` (canonical, 66 KB)

Plus `supabase/migrations/` (CLI-managed).

Categories: 10 user/tenant tables, 45 academic, 25 financial, 20 attendance/performance, 15 communication, 20 facilities/transport, 15 health/welfare, 20 admin/governance, 15 PD/recognition, 21 system/misc.

### Row Level Security — **CRITICAL GAP**

| Status | Count | % |
|---|---|---|
| Tables with RLS policies | 97 | 49% |
| Tables WITHOUT RLS | **99** | **51%** |

RLS helper functions: `get_auth_school_id()`, `get_auth_branch_id()`.

Two patterns:
- **School-only:** `USING (school_id = get_auth_school_id())`
- **School+branch:** `USING (school_id = ... AND (branch_id IS NULL OR branch_id = ...))`

**Tables missing RLS but holding `school_id` and/or `branch_id` include:**
`academic_performance`, `academic_terms`, `academic_tracks`, `academic_years`, `achievements`, `announcements`, `appointments`, `assessment_components`, `assessments`, `assignment_attachments`, `attendance_records`, `attendance_sessions`, `cbt_exams`, `cbt_questions`, `cbt_submissions`, `class_notes`, `class_sections`, `class_teachers`, `compliance_checklists`, `conferences`, `conversations`, `curricula`, `education_levels`, `emergency_alerts`, `equipment_inventory`, `invoices`, `learning_resources`, `permission_slips`, `quiz_responses`, `report_cards`, `scholarship_applications`, `student_activities`, `timetable`, `transactions`, `virtual_classes`, `visitor_logs` — and ~60 more.

**Mitigation in place:** App-level filtering via `enforceTenant` middleware and `withSchoolScope` utilities. But if any controller omits the `school_id` filter, that table leaks cross-tenant data with no DB safety net.

### Existing Multi-Tenant Framework

Per `MULTITENANT_IMPLEMENTATION_SUMMARY.md`:
- Header validation (`X-School-Id`, `X-Branch-Id`) in auth middleware: ✅ implemented
- `withSchoolScope` / `withSchoolBranchScope` utilities: ✅ created
- Backend services migrated to use them: ⏳ **PENDING — most services still do manual filtering**
- Frontend `lib/api.ts` automatically sending headers: ⏳ **PENDING**

---

## PHASE 5 — AUTH & RBAC

### Login Flow

**Real users:** the backend auth service (PKCE) → `auth.service.login()` → JWT (HS256) signed with `JWT_SECRET` → stored in `localStorage.auth_token` (also cookies in production) → `AuthContext.signIn()` sets state → `DashboardRouter` renders by role.

**Demo users:** Click demo role card → `api.demoLogin('admin')` → `POST /api/auth/demo/login` → backend seeds/finds demo user under `DEMO_SCHOOL_ID` (`d0ff3e95-9b4c-4c12-989c-e5640d3cacd1`) with IP-based virtual branch `demo-v-{sha256(IP)[0:8]}` → returns JWT with `is_demo: true` → frontend stores it like a real session.

**Invite accept:** Hash `#/invite/accept` → `InviteAcceptScreen` → sets the backend database session → `POST /api/invite/complete` → DB RPC `complete_staff_invite()` generates `school_generated_id` → welcome → dashboard.

### JWT Structure

```json
{
  "id": "uuid or generated_id",
  "email": "...",
  "role": "ADMIN | TEACHER | STUDENT | PARENT | ...",
  "school_id": "uuid",
  "branch_id": "uuid",
  "allowed_branch_ids": ["..."],
  "school_generated_id": "SCH_BRN_ROL_NNNN",
  "is_demo": false,
  "iat": ..., "exp": ...
}
```

Demo JWT additionally has `demo_ip` and uses a virtual branch ID.

### Backend Middleware

`authenticate()` in `backend/src/middleware/auth.middleware.ts`:
1. Extract token from `cookies.access_token` or `Authorization: Bearer` header
2. Verify with HS256 (locked — no algorithm confusion)
3. **Demo path:** verify token can ONLY access `DEMO_SCHOOL_ID`; reject otherwise with 403
4. **Real path:** fetch user + school + branch + teacher/parent profile from DB; validate `X-School-Id` and `X-Branch-Id` headers match JWT
5. Set `req.user`, `req.school_id`, `req.branch_id`

Other middleware: `enforceTenant` (validates + auto-injects school_id), `requireRole(['admin', ...])`, `csrf`, `security`, `plan` (subscription check), `authorization` (IDOR).

### Dashboard Routing

Pure role-based conditional rendering in `DashboardRouter.tsx`. No path-based guards (good — nothing to URL-guess), but frontend role is **cosmetic only** — backend JWT signature is the real boundary.

### RBAC Findings

| Layer | Status | Risk |
|---|---|---|
| JWT signature | ✅ HS256 locked | Low |
| Token storage | ⚠️ localStorage (XSS risk) + cookies | Medium |
| Demo bypass | ✅ Restricted to DEMO_SCHOOL_ID | Low |
| Route-level `requireRole` | ❌ Many admin routes lack it | **High** |
| Controller-level role checks | ⚠️ Inconsistent case (`'teacher'` vs `'TEACHER'`) | Medium |
| Tenant isolation (queries) | ✅ via `req.school_id` | Low |
| Branch isolation | ✅ via `getEffectiveBranchId()` | Low |
| Email verification | ❌ **DISABLED** in `VerifiedAdminRoute.tsx` | **High** |
| 2FA | ✅ Implemented, not enforced for admins | Medium |
| Password reset | ⚠️ No rate limit on forgot-password | Medium |
| IDOR protection | ⚠️ Only 6 models wrapped with `authorizeResource()` | Medium |

### Critical Auth Issues

1. **Email verification is fully bypassed** — `VerifiedAdminRoute.tsx` always returns `setIsVerified(true)`. Original logic commented out. **Account-takeover risk via password reset.**
2. **`POST /auth/create-user` lacks `requireRole`** — anyone with API access could create admin users if they know the endpoint.
3. **All `/api/admin-hub/*` routes use `authenticate` only — no `requireRole`** — a teacher who knows the endpoint could call admin-only reports.
4. **Demo credentials in source:** `lib/mockAuth.ts` hardcodes `password123` for 8 demo accounts.
5. **Demo mode within demo school does not sub-enforce roles** — if a controller omits role checks, demo teacher could see demo admin data.

---

## PHASE 6 — STATE & DATA LAYER

### Contexts (split across two folders — should merge)

| File | Folder | Purpose |
|---|---|---|
| `AuthContext.tsx` | `context/` | session, user, role, school switch, isDemo, demo role switching |
| `ProfileContext.tsx` | `context/` | profile (name/avatar/role) + refresh |
| `BranchContext.tsx` | `context/` | currentBranch, branchList, switching |
| `GamificationContext.tsx` | `context/` | student XP, level, badges |
| `SocketContext.tsx` | `context/` | Socket.io connection for realtime |
| `SaaSContext.tsx` | `contexts/` ← **the duplicate** | super-admin platform data (schools, plans, revenue) |

### Hooks (20)

`use-toast`, `useAutoSync` (legacy event-based), `useDemoRealtime`, `useInspections`, `useInspector`, `useOfflineQuery` (offline-first TanStack wrapper), `useOnlineStatus`, `useOptimisticMutation`, `usePersistentForm`, `useRealtime`, `useRealtimeListener`, `useRealtimeNotifications`, `useRealtimeRefresh`, `useRealtimeResource`, `useRealtimeSubscription`, `useRealtimeSync` (global init), `useSchools`, `useTeacherClasses`, `useTeacherStats`, `useTenantLimit`.

### Frontend Services (12)

`assignmentService`, `authService`, `classService`, `eventService`, `examService`, `financeService`, `parentService`, `PaymentService`, `quizService`, `RealtimeService`, `studentService`, `teacherService`.

### Backend Services (~60)

academic, admin-hub, ai, anonymousReport, assignment, attendance, audit, auth, behavior, bus, calendar, chat, class, conference, counseling, dashboard, demoReset, demoSeeder, email, emergency, exam, externalExam, extracurricular, fee, forum, gallery, gameScore, governance, health, hostel, idCard, idGenerator, infrastructure, integration, lessonPlan, maintenance, media, notice, notification, onboarding, parent, payroll, pd, plan, policy, queue (BullMQ), quiz, reportCard, resource, saas-analytics, savings, school, socket, student, studentReport, subject, teacher, timetable, transaction, transport, user, vendor, verification, version, virtual-class, volunteering.

### Types

- `types/index.ts` (29 KB) — DashboardType enum, AttendanceStatus, all core interfaces (School, Branch, Student, Teacher, Parent, ClassInfo, ReportCard, Assignment, Fee, ChatRoom, ChatMessage, Exam, Notice, TimetableEntry)
- `types-additional.ts` (8 KB) — IDCard, Alumni, FundraisingCampaign, MentorshipRequest, EnhancedStoreProduct, StudentPoints, LearnerProfile, SkillMatrix, VideoLesson, PerformancePrediction
- `types-saas.ts` (1.5 KB) — Plan, SubscriptionStatus, Subscription, PaymentDetails, SAAS_PRICING
- `types/inspector.ts` (4 KB) — Inspection, InspectionItem, InspectionResponse, InspectionPhoto, InspectionTemplate

---

## PHASE 7 — WHAT'S BROKEN, MOCKED, OR MISSING

### A. CRITICAL — Mock data in production paths

**Hardcoded demo school ID fallbacks in production code:**
| File | Line | Issue |
|---|---|---|
| `backend/src/services/school.service.ts` | 157 | `config.defaultSchoolId \|\| 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'` |
| `backend/src/middleware/tenant.middleware.ts` | 95 | `process.env.DEFAULT_SCHOOL_ID \|\| 'd0ff3e95-...'` |
| `backend/src/middleware/plan.middleware.ts` | 25 | `if (schoolId === 'd0ff3e95-...')` — production branch on demo ID |
| `backend/src/services/teacher.service.ts` | 644 | Silent fallback to demo branch if user lacks branch_id |

**Risk:** If env vars are missing in production, services default to the demo school. A bug elsewhere could route real users' data into demo space.

**Hardcoded mock dashboard data:**
- `components/proprietor/ProprietorDashboard.tsx:44-51` — fake revenue/students/teachers
- `components/proprietor/PeopleOverview.tsx:79,85,91` — fake KPI %
- `components/counselor/CounselorDashboard.tsx` — fake appointments + stats
- `components/examofficer/ExamOfficerDashboard.tsx` — fake stats

**Auto-running demo seeder:** `backend/src/services/demoSeeder.service.ts` `ensureDemoData()` runs on every server boot. Risk: demo school re-seeded in production on each restart.

### B. CRITICAL — Security/Config exposure

- `.env` committed with **plaintext** Paystack secret, Flutterwave secret, SMTP password (Gmail app password)
- `auth_token` and `auth_refresh_token` stored in `localStorage` (XSS-vulnerable) in addition to cookies
- `docker-compose.yml` uses `POSTGRES_PASSWORD: password123`

### C. HIGH — Incomplete features (TODO/stub)

- `components/student/StudentMessagesScreen.tsx:107` — unread count always false
- `components/admin/TeacherAttendanceScreen.tsx:94` — admin attendance override not implemented
- `components/student/cbt/StudentCBTListScreen.tsx:108` — CBT result validation missing
- Adventure mode (`components/student/adventure/`) — all 4 screens placeholder
- Counselor + ExamOfficer dashboards — single placeholder screen each

### D. HIGH — Test coverage

- 10 component tests total (admin: 5, parent: 1, student: 1, teacher: 2, auth: 1)
- **Zero backend unit tests** for 65 route files / 60 services
- Integration tests folder exists at `backend/tests/integration/` but execution unverified
- Playwright E2E suites exist (`tests/e2e/admin-deep-integration.spec.ts`, `admin-exhaustive-integration.spec.ts`) but `admin_integration_report.md` reports they never ran green due to port conflicts

### E. MEDIUM — Orphaned/stale code

| Folder | Status |
|---|---|
| `api_deprecated_vercel/` | Single re-export file, marked deprecated |
| `apps/`, `packages/` | Empty monorepo skeleton, never adopted |
| `school-auth-system/` | Legacy parallel structure |
| `brain/` | Dev scratch files |
| `owner/prod-config/` | Empty |
| `contexts/` | Only SaaSContext, should move to `context/` |
| `database_backup.sql` (11.5 MB) | Should be gitignored |
| `audit-results-*`, `playwright-report/` | Build artifacts in working tree |
| `backups/` | Dated SQL dumps |

### F. MEDIUM — Backend/Frontend gaps

No major frontend-without-backend mismatches found. Per `FINAL_FEATURES_AUDIT.md`, previous audits flagged some as missing but those endpoints exist (the flag was a parser bug). Some backend endpoints exist with no frontend caller, but they appear intentional (admin tooling).

### G. LOW — Tech debt

- `lib/api.ts` 126 KB monolith — should split per domain
- Multiple compression algos in `vite.config.mts` (Brotli + Gzip)
- `html2pdf.js` (abandoned), `json-server` (mock server in prod deps)
- ~100 `console.error` calls without structured logging
- 40+ silent catch blocks in `lib/api.ts`
- No `.env.example`

---

## PHASE 8 — LAUNCH-READINESS PUNCH LIST

### 🔴 BLOCKERS — Must fix before paid customers

1. **Apply RLS to the 99 unprotected tables.** They have `school_id` but no DB-level isolation. One missed `where school_id = ?` in any controller = cross-tenant data leak. (Use the existing pattern from `add_comprehensive_rls_policies.sql`.)
2. **Remove hardcoded demo school ID fallbacks** from `school.service.ts:157`, `tenant.middleware.ts:95`, `plan.middleware.ts:25`, `teacher.service.ts:644`. Make env var required; fail fast if missing.
3. **Re-enable email verification** in `VerifiedAdminRoute.tsx`.
4. **Add `requireRole` middleware to all `/api/admin-hub/*` routes** and `POST /auth/create-user`.
5. **Rotate exposed secrets** in `.env` (Paystack, Flutterwave, SMTP) and move to a secrets manager. Add `.env` to `.gitignore` if not already.
6. **Stop `demoSeeder.ensureDemoData()` from running on every boot in production.** Gate it on `NODE_ENV !== 'production'` or an explicit flag.
7. **Fix Proprietor / Counselor / ExamOfficer dashboards** — currently fake. If not shipping these roles, hide them from the role list.

### 🟡 HIGH — Should fix before launch

8. Wire backend services through `withSchoolScope`/`withSchoolBranchScope` per `MULTITENANT_IMPLEMENTATION_SUMMARY.md` Phase 2. (Framework is built but services not migrated.)
9. Ensure `lib/api.ts` sends `X-School-Id` and `X-Branch-Id` headers on every request (Phase 3 of multi-tenant plan).
10. Move JWT to HttpOnly cookies only; stop storing in `localStorage`.
11. Add rate limiting to `/auth/forgot-password`, `/auth/reset-password`, bulk fetch endpoints, file uploads.
12. Add Zod validation to all POST/PUT/PATCH endpoints (only `/auth/login` has it).
13. Normalize role case across controllers — `'TEACHER'` vs `'teacher'` mismatch silently fails.
14. Add audit logging to delete-user, change-role, fee mutation, payment recording.
15. Consolidate `prisma/schema.prisma`, `backend/prisma/schema.prisma`, `ddl.sql` to one source of truth.
16. Build E2E tests that actually run green (Playwright suites currently fail on port collision).
17. Add at least smoke tests for backend services — currently zero.

### 🟢 MEDIUM — Cleanup

18. Merge `contexts/SaaSContext.tsx` into `context/`. Delete empty folder.
19. Delete orphan folders: `api_deprecated_vercel/`, `apps/`, `packages/`, `school-auth-system/`, `brain/`, `owner/`.
20. Split `lib/api.ts` into per-domain modules.
21. Gitignore `database_backup.sql`, `audit-results-*`, `playwright-report/`, `backups/`.
22. Create `.env.example` listing every required variable.
23. Replace `console.error` with a structured logger (Pino).
24. Add hash-based routing to `ProprietorDashboard` (broken browser back/forward today).
25. Wire real data into Proprietor/People `% ` KPIs.

---

## WHAT IS FULLY WORKING

- Admin / SuperAdmin / Teacher / Student / Parent dashboards on the **golden path** (login, view, create, list, basic CRUD)
- Demo mode (role switching, virtual branch per IP, locked to demo school)
- School onboarding wizard (5-step)
- Staff invite system (Phase 5 in memory) including `/invite/accept` flow
- Standardized ID format (`SCH_BRN_ROL_NNNN`) via backend RPC
- Real-time chat, notifications, dashboard refresh via Socket.io
- Offline-first sync for mobile (IndexedDB + service worker)
- Paystack + Flutterwave integration
- AI features via Gemini (chat widget, performance summaries, lesson suggestions, parenting tips)
- CBT exams + 20+ student games
- Inspector workflow (multi-step with PDF report generation)

## WHAT IS PARTIALLY BUILT

- Multi-tenant isolation (framework exists; service migration incomplete)
- RLS coverage (49% of tables)
- Email verification (code exists but disabled)
- Backend test suite (folder + a few isolation tests, not consistently run)
- Proprietor dashboard sub-features (sub-components real, top-level fake)
- Adventure mode for students
- Audit logging (table exists, not consistently written)

## WHAT IS MISSING ENTIRELY

- ExamOfficer dashboard (1 placeholder file)
- Counselor dashboard (1 placeholder file)
- Backend unit test coverage
- Structured logging
- `.env.example`
- Single source of truth for Prisma schema
- IDOR protection beyond 6 models
- Rate limiting on password reset and bulk endpoints

---

## NEXT-STEP RECOMMENDATION

Address the 7 BLOCKERS in a single PR series before any paid signup. The framework is good — the gaps are in the **last 20% of follow-through** (RLS application, requireRole wiring, removing demo fallbacks, finishing 3 roles). Estimated 2-3 weeks of focused work to reach 80% launch-ready.

After blockers, the next investment is testing — the codebase is too large to ship safely with 10 component tests and zero backend tests.
