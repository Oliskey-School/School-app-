---
name: "oliskey-testing-skill"
version: "2.0.0"
description: "Production-grade testing skill for Oliskey School App. Tests Frontend, Backend, and Database layers per feature using parallel sub-agents. Built for Mr. Olamide (Oliskeylee)."
author: "Mr. Olamide (Oliskeylee)"
triggers:
  - "test"
  - "testing"
  - "run tests"
  - "check if this works"
  - "is this production ready"
  - "verify this feature"
  - "something is broken"
  - "before I push"
  - "full dashboard"
  - "test everything"
  - "test all features"
  - "is the dashboard ready"
  - "audit the dashboard"
  - "check multi-tenancy"
  - "is school data leaking"
  - "check data isolation"
stack:
  frontend: "React + Vitest + React Testing Library"
  backend: "Node.js + Express"
  database: "PostgreSQL via Docker - container: school-app-db"
  auth: "JWT - school_id, branch_id, role, user_id"
  orm: "Prisma"
  payments: "Paystack"
  state: "TanStack Query + React Context"
  styling: "TailwindCSS + NativeWind"
---

# Oliskey School App — Testing Skill

---

## ⚠️ MOST IMPORTANT RULE — READ THIS FIRST

**Mr. Olamide does not give code instructions. He gives outcome instructions.**

This means:
- He describes **what he wants to happen** — not how to code it
- The AI must figure out **how to make it work** on its own
- Never ask Mr. Olamide for code details — he does not want to be bothered with that
- Never say "I need your code to proceed" — find the code yourself, read the files, figure it out
- Never explain what you are doing in technical terms — just do it and report the result simply
- Never stop and ask for permission — just act, fix, and report

---

## 📋 How Mr. Olamide Gives Instructions

| What He Says | What You Do |
|---|---|
| "test the attendance feature" | Find all files, routes, tables and test all 3 layers |
| "make sure this works" | Test all 3 layers and fix everything until it works |
| "is this production ready" | Run the full checklist and give a simple Yes or No |
| "something is broken" | Find the bug across all 3 layers and fix it |
| "test full dashboard" | Spawn sub-agents for every feature in parallel |
| "test admin dashboard" | Spawn sub-agents for all 12 Admin features in parallel |

---

## 📢 How to Report Back to Mr. Olamide

- Use **simple plain English** — no technical jargon
- Always give a **clear status** — Working ✅ or Broken ❌ or Needs Attention ⚠️
- If something is broken — one sentence: what broke + what was done to fix it
- Never dump long code blocks in the report
- Keep every report **short and to the point**

**✅ Good Report:**
```
✅ Login — Working perfectly
❌ Attendance Approval — Broken. The approve button was not updating the screen.
   Fixed: Added the missing screen update after the server responded.
✅ Fee Payment — Working perfectly
⚠️ Report Card — Works but slow. Needs performance check.
```

**❌ Bad Report:**
```
The issue was found in the setAttendanceStatus() hook which was not being
called inside the .then() promise chain after the fetch() resolved...
```

---

## 🚨 ABSOLUTE RULE — ALWAYS ASK FOR THE FLOW FIRST

**This rule has NO exceptions. It applies to EVERY feature. EVERY time.**

Before touching any code, running any test, or spawning any sub-agent — the AI must STOP and ask Mr. Olamide for the flow of the feature.

```
❌ NEVER do this:
   Mr. Olamide says "test attendance" → AI immediately starts testing
   
✅ ALWAYS do this:
   Mr. Olamide says "test attendance" → AI asks for the flow first → 
   Mr. Olamide explains the flow → AI maps it → Then testing begins
```

**Even if the AI thinks it already knows how the feature works — it must still ask.**
**Even if the feature was tested before — it must still ask. The flow may have changed.**
**Even for full dashboard tests — ask for each feature's flow before assigning sub-agents.**

---

### Exact Words to Use When Asking for the Flow

Every time Mr. Olamide mentions a feature, the AI must ask using this exact format:

```
Before I test [Feature Name], I need to understand exactly how it works.
Please walk me through it:

1. FLOW — Walk me through it step by step.
   What does the user click first? What happens next? What is the final result?

2. ROLES — Who is involved?
   Which dashboards does this flow touch? (Admin? Teacher? Student? Parent?)

3. API — Does it call the backend?
   What does it send to the server and what does it get back?

4. SCREEN — What changes on the screen after the server responds?

5. ERRORS — What should happen when something goes wrong?
   (wrong input, no internet, server failure, permission denied)

6. DATABASE — Does it save, update, or delete anything?
   Which table?

7. ISOLATION — Is this restricted to one school? One branch? Or global?
```

---

### What Happens If Mr. Olamide Skips a Question

If Mr. Olamide does not answer all 7 questions, the AI must politely ask again for the missing answers before proceeding. Never fill in the gaps by guessing.

```
Example:
Mr. Olamide answered questions 1–5 but skipped 6 and 7.

AI must say:
"Thank you — I have the flow for questions 1 to 5.
 I just need two more answers before I start:
 6. Which database table does this feature write to?
 7. Should the data be restricted to one school only or one branch?"
```

---

### For Full Dashboard Tests — Ask Per Feature

When Mr. Olamide says "test full dashboard" or "test admin dashboard":
- Do NOT spawn sub-agents immediately
- Ask for the flow of each feature one by one OR ask Mr. Olamide to confirm the flows already documented in this skill are still correct
- Only after confirmation — spawn all sub-agents in parallel

```
Example:
"You asked me to test the full Admin Dashboard.
 Before I start, I need to confirm the flow for each of the 12 features.

 Option 1 — If the flows have NOT changed:
 Just say 'flows are the same' and I will use the existing flow maps.

 Option 2 — If any flow has changed:
 Tell me which feature changed and walk me through the new flow."
```

---

## 🔍 STEP 0 — DISCOVERY QUESTIONS (ALWAYS DO THIS FIRST)

Before writing or running any test — always ask Mr. Olamide these 7 questions. Never assume. Always map the flow first. Then test.

**1. Feature Flow**
> "Can you walk me through this feature step by step — from when the user first clicks to when they see the final result?"

**2. Roles Involved**
> "Which user roles are involved? For example — is it just the student, or also the teacher and admin?"

**3. API Calls**
> "Does this feature call the backend? What does it send and what does it expect back?"

**4. Screen Updates**
> "After the server responds — what should change on the screen?"

**5. Error Scenarios**
> "What can go wrong? Wrong input, no internet, server failure, permission denied?"

**6. Database Impact**
> "Does this feature save, update, or delete anything in the database? Which table?"

**7. Data Isolation Scope**
> "Should this be restricted to one school only? One branch only? Or global?"

### Flow Map Template (Fill Before Testing)

```
FEATURE: [Name]
─────────────────────────────────────────────────────
FLOW:
  Step 1 → [what happens]
  Step 2 → [what happens]
  Step 3 → [what happens]

ROLES            : [who is involved]
API CALLS        : [endpoints called]
SCREEN UPDATES   : [what changes on UI after server responds]
ERROR SCENARIOS  : [what can go wrong]
DB TABLES        : [what is written/updated/deleted]
ISOLATION SCOPE  : [school_id / branch_id enforcement]
─────────────────────────────────────────────────────
```

**Only after Mr. Olamide confirms this map — start testing.**

---

## 🗂️ TESTING ORDER PER FEATURE

```
Feature → Frontend → Backend → Database
              ↓ fix all errors before moving to next layer
```

Never move to the next layer if the current layer has unresolved errors.

---

## 🖥️ LAYER 1 — FRONTEND TESTS

**Run with:** `npm run test:run`

**Happy Path — things that should work:**
- User performs the correct action → UI shows the correct result
- Correct credentials → navigate to correct dashboard
- Form submitted successfully → success message shown

**Error States — things that should fail gracefully:**
- Server returns error → UI shows correct error message (not a blank screen)
- No internet → UI shows "Check your connection"
- Wrong input → UI shows specific error message
- Server succeeds but screen does NOT update → Bug: missing screen update call

**Access & Role Guards:**
- User not logged in → redirected to login page
- Wrong role tries to access a page → access denied shown
- JWT missing school_id or role → logout and show error

### Frontend Test Template

```js
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

describe('Feature: [Feature Name]', () => {

  it('shows success when action completes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, status: 'Approved' })
    })
    render(<YourComponent />)
    await userEvent.click(screen.getByText('Approve'))
    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })
  })

  it('shows error message when server fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: 'Something went wrong' })
    })
    render(<YourComponent />)
    await userEvent.click(screen.getByText('Approve'))
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

})
```

---

## ⚙️ LAYER 2 — BACKEND TESTS

**Run with:** `npx vitest run backend/tests/integration/`

**Success Cases:**
- Correct request → correct response shape
- Response contains expected fields (`success`, `data`, `status`)
- Correct HTTP status code (200, 201, etc.)

**Failure Cases:**
- Missing required fields → 400 Bad Request
- Invalid or missing JWT → 401 Unauthorized
- Wrong role → 403 Forbidden
- Server error → 500 with safe message (never expose raw DB errors)

**Critical Rules:**
- Every protected route MUST verify JWT before doing anything
- Every database query must be scoped to `school_id` via Prisma WHERE clause
- After every DB update → confirm it succeeded before sending `success: true`

### ⚠️ Most Common Silent Bug — Always Check

```js
// ❌ WRONG — sends success even if DB update failed
await prisma.attendance.update({ where: { id }, data: { status: 'Approved' } })
res.json({ success: true })

// ✅ CORRECT
try {
  const updated = await prisma.attendance.update({
    where: { id: attendanceId, school_id: schoolId },
    data: { status: 'Approved' }
  })
  res.json({ success: true, data: updated })
} catch (error) {
  res.status(500).json({ success: false, message: 'Update failed. Please try again.' })
}
```

### Backend Test Template

```js
import request from 'supertest'
import app from '../../app.js'

describe('POST /api/attendance/approve', () => {

  it('returns 200 and updates status to Approved', async () => {
    const res = await request(app)
      .post('/api/attendance/approve')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ teacherId: 'teacher-uuid', schoolId: 'school-uuid' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('Approved')
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/attendance/approve')
      .send({ teacherId: 'teacher-uuid' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when teacherId is missing', async () => {
    const res = await request(app)
      .post('/api/attendance/approve')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

})
```

---

## 🗄️ LAYER 3 — DATABASE TESTS

**Container:** `school-app-db` (Docker)
**Command:** `docker exec -i school-app-db psql -U postgres -d school_app -c "QUERY"`

### Confirm Data After Every Write Operation

```bash
# Confirm attendance status updated
docker exec -i school-app-db psql -U postgres -d school_app -c \
"SELECT id, status, school_id FROM attendance WHERE teacher_id = 'teacher-uuid';"

# Confirm new user created correctly
docker exec -i school-app-db psql -U postgres -d school_app -c \
"SELECT id, school_id, branch_id, role FROM users WHERE email = 'user@email.com';"

# Confirm report card published
docker exec -i school-app-db psql -U postgres -d school_app -c \
"SELECT id, is_published, school_id FROM report_cards WHERE student_id = 'student-uuid';"
```

### School Data Isolation Tests — CRITICAL

```bash
# 1. Confirm school_id column exists on a table
docker exec -i school-app-db psql -U postgres -d school_app -c \
"SELECT column_name FROM information_schema.columns
 WHERE table_name = 'attendance' AND column_name = 'school_id';"

# 2. School B's data must return 0 rows when scoped to School A
docker exec -i school-app-db psql -U postgres -d school_app -c \
"SELECT COUNT(*) FROM attendance WHERE school_id = 'school-b-uuid';"
# Expected: 0

# 3. Branch isolation check
docker exec -i school-app-db psql -U postgres -d school_app -c \
"SELECT COUNT(*) FROM attendance WHERE school_id = 'school-uuid' AND branch_id = 'branch-uuid';"
```

### Database Check Reference Per Feature

| Feature | Table | What to Confirm |
|---|---|---|
| Student Login | users | school_id, role, is_active = true |
| Teacher Login | users | school_id, branch_id, role = teacher |
| Attendance Marked | attendance | status = Marked, school_id correct |
| Attendance Approved | attendance | status = Approved |
| Fee Payment | payments | amount, student_id, school_id recorded |
| Grades Submitted | results | subject, score, student_id, school_id |
| Report Published | report_cards | is_published = true |
| Exam Created | exams | school_id, class, subject, questions |
| Student Created | users | school_id, branch_id, role = student |

---

## 🤖 SUB-AGENT TASK ASSIGNMENT SYSTEM

Every task gets its own sub-agent. All sub-agents run at the same time — in parallel. No waiting.

### THE GOLDEN RULE
> **One task = One sub-agent. Always. No exceptions.**

---

### How the Main Agent Works

```
MAIN AGENT JOB:
  1. Receive Mr. Olamide's instruction
  2. Run Discovery Questions (Step 0)
  3. Map the feature flow — confirm with Mr. Olamide
  4. Break everything into individual tasks
  5. Assign each task to a dedicated sub-agent
  6. All sub-agents run in PARALLEL — no waiting
  7. Fix Agents spawned immediately for any bug found
  8. Collect all results when done
  9. Compile one clean Master Report
  10. Deliver to Mr. Olamide in plain English
```

---

### The 4 Types of Sub-Agents

```
┌──────────────────────────────────────────────────────────┐
│  TYPE 1 — FRONTEND AGENT                                 │
│  Job    : Test only the UI layer of one feature          │
│  Runs   : npm run test:run                               │
│  Checks : buttons, messages, navigation, screen updates  │
├──────────────────────────────────────────────────────────┤
│  TYPE 2 — BACKEND AGENT                                  │
│  Job    : Test only the API layer of one feature         │
│  Runs   : npx vitest run backend/tests/integration/      │
│  Checks : endpoints, JWT, error responses, school_id     │
├──────────────────────────────────────────────────────────┤
│  TYPE 3 — DATABASE AGENT                                 │
│  Job    : Test only the data layer of one feature        │
│  Runs   : docker exec -i school-app-db psql queries      │
│  Checks : data saved correctly, school isolation         │
├──────────────────────────────────────────────────────────┤
│  TYPE 4 — FIX AGENT                                      │
│  Job    : Fix a specific error found by another agent    │
│  Trigger: Spawned immediately when any agent finds a bug │
│  Reports: What was broken and exactly what was fixed     │
└──────────────────────────────────────────────────────────┘
```

---

### Task Assignment Template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sub-Agent Type  : [Frontend / Backend / Database / Fix]
Feature         : [Feature name]
Task            : [Exactly what to test or fix]
Expected Result : [What passing looks like]
On Failure      : Spawn Fix Agent immediately — do not wait
Report To       : Main Agent when done — never Mr. Olamide directly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Task Assignment Flow — Single Feature

**"test attendance"**
```
Main Agent runs Discovery → Maps flow → Assigns 3 tasks in PARALLEL:

  ┌─────────────────────────────────────────┐
  │ Frontend Agent → Test attendance UI     │
  │ Backend Agent  → Test attendance API    │  ← All at same time
  │ Database Agent → Test attendance DB     │
  └─────────────────────────────────────────┘
          ↓
  Bug found → Fix Agent spawned immediately
          ↓
  All finish → Main Agent compiles report → Delivers to Mr. Olamide
```

---

### Task Assignment Flow — Full Dashboard

**"test full admin dashboard"**
```
Main Agent spawns 36 sub-agents ALL AT THE SAME TIME:

  Feature 1  (Login)       → Frontend Agent + Backend Agent + Database Agent
  Feature 2  (Students)    → Frontend Agent + Backend Agent + Database Agent
  Feature 3  (Teachers)    → Frontend Agent + Backend Agent + Database Agent
  Feature 4  (Attendance)  → Frontend Agent + Backend Agent + Database Agent
  Feature 5  (Fees)        → Frontend Agent + Backend Agent + Database Agent
  Feature 6  (Reports)     → Frontend Agent + Backend Agent + Database Agent
  Feature 7  (Exams)       → Frontend Agent + Backend Agent + Database Agent
  Feature 8  (Timetable)   → Frontend Agent + Backend Agent + Database Agent
  Feature 9  (Messages)    → Frontend Agent + Backend Agent + Database Agent
  Feature 10 (Compliance)  → Frontend Agent + Backend Agent + Database Agent
  Feature 11 (Branches)    → Frontend Agent + Backend Agent + Database Agent
  Feature 12 (Analytics)   → Frontend Agent + Backend Agent + Database Agent
          ↓
  Fix Agents spawned instantly for any bug
          ↓
  Master Report compiled when ALL agents finish
```

---

### Sub-Agent Rules

- ✅ Do your assigned task only — never touch another feature
- ✅ Fix errors yourself before reporting
- ✅ If you cannot fix it — report clearly what is broken and why
- ✅ Report back in plain English — no code dumps
- ✅ Never ask Mr. Olamide for help — figure it out yourself
- ✅ Never stop mid-task — always complete and report
- ❌ Never work on more than one feature at a time
- ❌ Never wait for another sub-agent before starting your task
- ❌ Never report directly to Mr. Olamide — always report to Main Agent first

---

### Speed Rules

```
✅ Sub-agents for DIFFERENT features → run in PARALLEL
✅ Frontend + Backend + Database for the SAME feature → run in PARALLEL
✅ Fix Agents spawned IMMEDIATELY when a bug is found
✅ Master Report compiled only AFTER all agents finish
❌ Never run features one by one
❌ Never wait for one layer before starting another
```

---

### Dashboard Feature Maps

#### 🔵 Admin Dashboard — 12 Features (36 sub-agents)
```
Feature 1  → Login & Auth
Feature 2  → Student Management (create, edit, suspend)
Feature 3  → Teacher Management (create, edit, suspend)
Feature 4  → Attendance Approval (mark, pending, approve)
Feature 5  → Fee Management (setup, tracking, arrears, budget)
Feature 6  → Results & Report Cards (submit, publish, download)
Feature 7  → Exam Management (create, assign, CBT, JAMB/WAEC)
Feature 8  → Timetable Generator (AI timetable, conflict check)
Feature 9  → Communication Hub (broadcast, emergency alerts)
Feature 10 → Compliance Dashboard (green/amber/red)
Feature 11 → Branch Management (multi-branch isolation)
Feature 12 → Analytics & KPIs (real-time stats, charts)
```

#### 🟢 Teacher Dashboard — 10 Features (30 sub-agents)
```
Feature 1  → Login & Role Routing
Feature 2  → Student Attendance Marking
Feature 3  → Teacher Self-Attendance (mark, pending, approved)
Feature 4  → Gradebook (enter grades, submit)
Feature 5  → Lesson Planner & Notes Upload
Feature 6  → Assignment Creator & Submission Tracker
Feature 7  → CBT Quiz Builder
Feature 8  → AI Performance Summary per Student
Feature 9  → Virtual Classroom
Feature 10 → Payslip & Leave Requests
```

#### 🟡 Parent Dashboard — 8 Features (24 sub-agents)
```
Feature 1  → Login & Role Routing
Feature 2  → Child Attendance & Grades View
Feature 3  → Homework & Assignment Tracking
Feature 4  → Report Card View & Download
Feature 5  → Fee Payment (Paystack)
Feature 6  → Secure Messaging with Teachers
Feature 7  → Panic Button & Security Settings
Feature 8  → Live Bus Tracking
```

#### 🔴 Student Dashboard — 9 Features (27 sub-agents)
```
Feature 1  → Login & Role Routing
Feature 2  → Today's Focus (classes, assignments, quizzes)
Feature 3  → AI Study Buddy
Feature 4  → CBT Exam Player (secure, timed)
Feature 5  → Results Tracking & Report Download
Feature 6  → Video Lesson & Digital Library
Feature 7  → Achievements & Badges (gamification)
Feature 8  → Games Hub (Math Sprint, Geo Guesser, etc.)
Feature 9  → AI Adventure Quest (content → quizzes)
```

---

### Full Dashboard Sub-Agent Count

| Dashboard | Features | Sub-Agents |
|---|---|---|
| Admin | 12 | 36 |
| Teacher | 10 | 30 |
| Parent | 8 | 24 |
| Student | 9 | 27 |
| **All Dashboards** | **39** | **117** |

---

### Sub-Agent Report Template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUB-AGENT REPORT — [Feature Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️  FRONTEND
  Status  : ✅ Pass / ❌ Fail / ⚠️ Warning
  Tested  : [what was tested]
  Errors  : [errors found]
  Fixed   : [what was fixed]

⚙️  BACKEND
  Status  : ✅ Pass / ❌ Fail / ⚠️ Warning
  Tested  : [what was tested]
  Errors  : [errors found]
  Fixed   : [what was fixed]

🗄️  DATABASE
  Status  : ✅ Pass / ❌ Fail / ⚠️ Warning
  Tested  : [what was tested]
  Errors  : [errors found]
  Fixed   : [what was fixed]

🏁  FEATURE STATUS: ✅ Production Ready / ❌ Not Ready / ⚠️ Needs Review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Master Report Template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MASTER REPORT — [Dashboard Name] Full Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature                  | Frontend | Backend | Database | Overall
────────────────────────────────────────────────────────────────────
Login & Auth             |    ✅    |    ✅   |    ✅    |   ✅
Student Management       |    ✅    |    ✅   |    ✅    |   ✅
Attendance Approval      |    ✅    |    ✅   |    ✅    |   ✅
Fee Management           |    ⚠️    |    ✅   |    ✅    |   ⚠️
Results & Report Card    |    ✅    |    ❌   |    ✅    |   ❌
Exam Management          |    ✅    |    ✅   |    ✅    |   ✅
...                      |    ...   |    ...  |    ...   |   ...

────────────────────────────────────────────────────────────────────
TOTAL PASSED   : X / X features
TOTAL FAILED   : X → [list them]
TOTAL WARNINGS : X → [list them]

🏁 DASHBOARD STATUS: ✅ Production Ready / ❌ Not Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Quick Trigger Reference

| Mr. Olamide Says | Main Agent Does |
|---|---|
| "test login" | 3 sub-agents for Login |
| "test [any feature]" | 3 sub-agents for that feature |
| "test admin dashboard" | 36 sub-agents in parallel |
| "test teacher dashboard" | 30 sub-agents in parallel |
| "test parent dashboard" | 24 sub-agents in parallel |
| "test student dashboard" | 27 sub-agents in parallel |
| "test full dashboard" | 117 sub-agents — all in parallel |
| "something is broken" | Find bug across all 3 layers, fix, report |
| "is this production ready" | Run full checklist, answer Yes or No |

---

## 🏁 FEATURE-SPECIFIC TEST SUITES

### 1. 🔐 Login & Auth (All Roles)
```
Frontend:
  ✅ Correct credentials → navigate to correct dashboard for that role
  ❌ Wrong email → "Email not found"
  ❌ Wrong password → "Incorrect password, click here to reset"
  ❌ No internet → "Check your connection"
  ❌ Suspended account → "Your account has been suspended"

Backend:
  ✅ Valid credentials → return JWT with school_id, branch_id, role, user_id
  ❌ Wrong password → 401 (never reveal which field is wrong)
  ❌ User not found → 401
  ❌ Missing fields → 400
  ❌ is_active = false → 403

Database:
  ✅ User exists with correct school_id, branch_id, role
  ✅ Password hash matches (bcryptjs)
  ✅ is_active = true
```

### 2. 📋 Teacher Attendance Approval Workflow
```
Frontend:
  ✅ Teacher marks own attendance → status shows "Pending"
  ✅ Admin sees "Pending" on their dashboard
  ✅ Admin clicks Approve → screen immediately shows "Approved"
  ✅ Teacher logs back in → attendance shows "Approved"
  ❌ Admin approves but screen still shows "Pending" → missing screen update

Backend:
  ✅ POST /api/attendance/mark → saves with status "Pending" + school_id
  ✅ POST /api/attendance/approve → updates to "Approved", confirms DB updated
  ❌ Missing teacherId → 400
  ❌ Non-admin JWT → 403
  ❌ School A admin approving School B teacher → 403

Database:
  ✅ Row exists with school_id, branch_id, teacher_id
  ✅ Status changed from "Pending" to "Approved"
  ✅ Isolation: School A cannot update School B attendance
```

### 3. 💳 Fee Payment (Paystack)
```
Frontend:
  ✅ Parent clicks Pay → Paystack popup opens
  ✅ Payment succeeds → receipt shown, balance updates
  ❌ Payment fails → "Payment failed, please try again"
  ❌ Popup closed without paying → no state change

Backend:
  ✅ Verify Paystack webhook signature before processing
  ✅ Confirm amount matches expected fee
  ✅ Record with school_id, student_id, amount, date
  ❌ Duplicate webhook → reject (do not double-record)

Database:
  ✅ Payment record exists with correct school_id
  ✅ Fee balance updated for correct student
  ✅ No duplicate records
```

### 4. 📊 Results & Report Card
```
Frontend:
  ✅ Teacher enters grades → saved, confirmation shown
  ✅ Admin publishes → students can now see it
  ✅ Student views → correct grades shown
  ❌ Student views before published → "Not yet available"
  ❌ Teacher submits twice → "Already submitted"

Backend:
  ✅ POST /api/results → saves with school_id, student_id, subject
  ✅ POST /api/reports/publish → sets is_published = true
  ✅ GET /api/reports/:studentId → only returns if is_published = true
  ❌ Teacher submitting for another school's student → 403

Database:
  ✅ Results saved with correct student_id, school_id
  ✅ is_published = true after Admin publishes
  ✅ Isolation: Student can only see their own school's results
```

### 5. 📝 Exam & CBT
```
Frontend:
  ✅ Exam created → shows in exam list
  ✅ Student starts exam → timer starts, questions load
  ✅ Student submits → confirmation shown, cannot resubmit
  ❌ Timer runs out → auto-submit triggered
  ❌ Another student's exam → access denied

Backend:
  ✅ POST /api/exams → creates scoped to school_id
  ✅ POST /api/exams/submit → saves answers, calculates score
  ❌ Submission after time expired → rejected
  ❌ Duplicate submission → 400

Database:
  ✅ Exam exists with school_id, class, subject
  ✅ Answers saved with student_id, exam_id, school_id
  ✅ Score calculated and saved correctly
```

---

## ✅ PRODUCTION READINESS CHECKLIST

**Frontend:**
- [ ] Screen shows correct result for success
- [ ] Screen shows correct error for every failure scenario
- [ ] Screen updates immediately after server responds
- [ ] User cannot access pages they do not have permission for
- [ ] Demo account tested separately from real accounts

**Backend:**
- [ ] JWT validated on every protected route
- [ ] Every DB query scoped to `school_id`
- [ ] Every DB query scoped to `branch_id` where applicable
- [ ] DB response checked before sending `success: true`
- [ ] Raw DB errors never exposed to client
- [ ] Role-based access enforced on every route

**Database:**
- [ ] Every table has `school_id` column
- [ ] Data actually saved/updated after every write
- [ ] School A cannot access School B data
- [ ] Branch isolation working correctly
- [ ] No duplicate records created

---

## 🔬 GENERAL DASHBOARD & MULTI-TENANCY AUDIT

**When to use this:** When Mr. Olamide says any of these:
- "audit the dashboard"
- "check the full dashboard"
- "is the dashboard secure"
- "check multi-tenancy"
- "audit data isolation"
- "check school data is not leaking"

This is a deep 4-phase audit. Assign one sub-agent per phase. All 4 run in parallel.

---

### Audit Sub-Agent Assignment

```
Main Agent spawns 4 sub-agents in PARALLEL:

  Audit Agent 1 → Phase 1: Component & API Mapping
  Audit Agent 2 → Phase 2: Multi-Tenancy & Security
  Audit Agent 3 → Phase 3: State & Resiliency
  Audit Agent 4 → Phase 4: Fix & Output
```

---

### Phase 1 — Component & API Mapping (Audit Agent 1)

**Job:** Find every UI widget on the dashboard and confirm it is connected to a real API.

```
WHAT TO SCAN:
  - Summary / Stat Cards
  - Data Tables
  - Charts and Graphs
  - Navigation Sidebar
  - Any other UI widget on the dashboard

FOR EACH WIDGET:
  ✅ Trace it to its custom hook or API call
  ✅ Confirm it calls a real /api/v1/... Express endpoint
  ❌ If it uses hardcoded or mock data → it is broken

FIX:
  Write the exact data-fetching logic (useEffect or TanStack Query)
  to connect the widget to its correct Express endpoint.
  Never leave a widget using fake data.
```

**Pass Condition:** Every single widget on the dashboard is fetching live data from a real API endpoint.

---

### Phase 2 — Multi-Tenancy & Security Enforcement (Audit Agent 2)

**This is the most critical phase. School data isolation must be bulletproof.**

```
WHAT TO CHECK IN EVERY EXPRESS CONTROLLER:

  1. school_id SOURCE
     ✅ school_id must come from the JWT (req.user.school_id)
     ❌ school_id must NEVER come from req.body or req.params
        (a malicious user could send any school_id they want)

  2. PRISMA QUERY SCOPE
     ✅ Every Prisma query must have: where: { school_id: req.user.school_id }
     ❌ Any query missing school_id filter = cross-tenant data leak = CRITICAL BUG

  3. JWT VALIDATION
     ✅ JWT must be verified on every protected route
     ✅ JWT must contain: school_id, branch_id, role, user_id
     ❌ Missing any of these = security vulnerability

CORRECT PATTERN — Always enforce this:
  const students = await prisma.students.findMany({
    where: {
      school_id: req.user.school_id,  // ← From JWT only
      branch_id: req.user.branch_id   // ← Scope to branch if applicable
    }
  })

WRONG PATTERN — Fix immediately if found:
  const students = await prisma.students.findMany()
  // ← No school_id filter = every school's students returned = CRITICAL BUG
```

**Pass Condition:** Every single API route scopes its Prisma query to `req.user.school_id`. Zero cross-tenant data leakage.

---

### Phase 3 — Universal State & Resiliency (Audit Agent 3)

**Job:** Confirm the dashboard never fails silently. Every error must be visible. Every loading state must be shown.

```
WHAT TO CHECK:

  1. LOADING STATES
     ✅ Every widget shows a Skeleton loader or Spinner while data is loading
     ❌ Widget shows blank/empty while loading = bad user experience

  2. ERROR HANDLING
     ✅ If API returns 500 → show a Toast notification: "Something went wrong"
     ✅ If API returns 401 → redirect to login page immediately
     ✅ If API returns 403 → show "You do not have permission"
     ❌ Any silent failure (blank screen, frozen UI) = broken

  3. ERROR BOUNDARY
     ✅ A global React Error Boundary must wrap the dashboard
     ❌ If one widget crashes and takes down the whole dashboard = broken

  4. EMPTY STATES
     ✅ If API returns empty data → show "No records found" message
     ❌ Showing nothing when data is empty = confusing to users

FIX PATTERN for Loading + Error + Empty:
  if (isLoading) return <SkeletonLoader />
  if (error) return <Toast message="Something went wrong. Please try again." />
  if (data.length === 0) return <EmptyState message="No records found." />
  return <DataTable data={data} />
```

**Pass Condition:** Every widget handles loading, error, and empty states. Dashboard never fails silently.

---

### Phase 4 — Fix & Output (Audit Agent 4)

**Job:** After Phases 1–3 complete, fix every issue found and deliver exact working code.

```
RULES FOR THIS PHASE:
  - Do not summarize problems — fix them
  - Output the exact corrected React component code
  - Output the exact corrected Express route handler
  - Output the exact corrected Prisma query
  - Every fix must be copy-pasteable and ready to use
  - Never leave a single issue unfixed
```

**Output format for each fix:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIX REPORT — [Widget or Route Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase    : [1 / 2 / 3]
Problem  : [What was wrong — one sentence]
Fix      : [What was changed — one sentence]
Code     : [Exact corrected code — ready to paste]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Audit Master Report Template

After all 4 audit agents finish, Main Agent compiles this report for Mr. Olamide:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DASHBOARD AUDIT REPORT — [Dashboard Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1 — API Mapping        : ✅ All widgets connected / ❌ X widgets using fake data
Phase 2 — Multi-Tenancy      : ✅ All routes secure / ❌ X routes missing school_id filter
Phase 3 — State & Resiliency : ✅ All states handled / ❌ X widgets fail silently
Phase 4 — Fixes Applied      : ✅ All issues fixed / ❌ X issues could not be auto-fixed

────────────────────────────────────────────────────────
ISSUES FOUND & FIXED:
  ❌ Stats Card — was using hardcoded data. Fixed: connected to /api/v1/stats
  ❌ Students Table — missing school_id filter. Fixed: added where: { school_id }
  ❌ Attendance Chart — no loading state. Fixed: added Skeleton loader
  ✅ Navigation Sidebar — already working correctly

────────────────────────────────────────────────────────
🏁 DASHBOARD STATUS: ✅ Secure & Production Ready / ❌ Issues Remain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📌 NOTES

- Always test demo account separately from production accounts
- JWT must always contain: `school_id`, `branch_id`, `role`, `user_id`
- Every database table must have `school_id` — no exceptions
- School data isolation is enforced by Prisma WHERE clauses in the backend — not Supabase RLS
- **Silent failure:** Server responds success but screen does not update = missing screen update call
- **Data not updating:** Server and screen work but old data in database = wrong `school_id` in WHERE clause or Prisma error not caught
- **Unexpected access denied:** JWT does not contain `school_id` or role mismatch