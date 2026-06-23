# Student Module — Full Fix Design
**Date:** 2026-06-23  
**Scope:** All 23 audit findings + 4 missing features  
**Waves:** 4 (Sequential — security → integrity → UX → features)

---

## Wave 1 — Security & Isolation (Backend only, no migration)

### CRIT-1: Plaintext password in notifications
**File:** `backend/src/services/student.service.ts`  
**Change:** Remove the raw `generatedPassword` variable from every notification body.  
Store a masked hint ("password provided at enrollment") or send credentials only to the parent/student via a dedicated email — never in a broadcast class notification.  
The `initial_password` column continues storing the raw value for admin credential display, but notification payloads must never include it.

### CRIT-2: `getStudentStats` / `getStudentAchievements` missing `school_id`
**File:** `backend/src/services/student.service.ts` lines 1047–1074  
**Change:** Add `school_id: schoolId` to every Prisma query inside both functions:
- `attendance.findMany`
- `assignmentSubmission.count`
- `academicPerformance.findMany`
- `achievement.count`
- `achievement.count` (achievements variant)

### CRIT-3: Self-healing creates Student records for ADMIN/PROPRIETOR
**File:** `backend/src/services/student.service.ts` lines 738–783  
**Change:** Wrap the self-healing block with `if (user.role !== 'STUDENT') throw Object.assign(new Error('Forbidden'), { status: 403 })` at the top of `getStudentProfileByUserId` before any auto-create logic runs.

### CRIT-4: Teacher can save attendance for any class
**File:** `backend/src/controllers/attendance.controller.ts` lines 94–106  
**Change:** Before passing records to `AttendanceService.saveAttendance`, when the caller is a TEACHER, extract all unique `class_id` values from the payload and verify a `ClassTeacher` record exists for each `(teacher.id, class_id)` pair. Reject with 403 if any class_id is not owned by the teacher.

### CRIT-5: `getStudentsBySubject` no `school_id` on subject lookup
**File:** `backend/src/services/student.service.ts` lines 1406–1454  
**Change:** Replace `subject.findUnique({ where: { id: subjectId } })` with `subject.findFirst({ where: { id: subjectId, school_id: schoolId } })`. Throw a 404 if the result is null.

### CRIT-6: Email duplicate check skipped for generated emails
**File:** `backend/src/services/student.service.ts` lines 33, 48–56  
**Change:** Move the duplicate email check to always run on `studentEmail` (the resolved value, whether typed or generated), not gated on `enrollmentData.email`.

### CRIT-7 + HIGH-8: `school_generated_id` silently skipped when `branchId` null
**File:** `backend/src/services/student.service.ts` lines 79–93 (enroll) and 443 (approve)  
**Change:**
- At enrollment: if `branchId` is falsy, attempt to resolve it from the school's single/main branch before the ID generation block. If still null after resolution, throw `Error('Branch is required to generate a student ID')`.
- At approval: resolve `branchId` from `student.branch_id` when not explicitly passed.

---

## Wave 2 — Data Integrity (Backend + 1 schema migration)

### HIGH-1: `updateStudent` allows free `branch_id` / `school_generated_id` change
**File:** `backend/src/services/student.service.ts` lines 614–618  
**Change:** Remove `branch_id` and `school_generated_id` from `allowedFields`. Branch changes must go through `BranchTransferService.transferUser`. ID changes are never allowed via update.

### HIGH-2: No DB unique constraint on `admission_number`
**File:** `backend/prisma/schema.prisma`  
**Change:** Add to `Student` model:
```prisma
@@unique([school_id, admission_number])
```
**Migration required.** PostgreSQL treats each NULL as distinct in a unique index, so existing rows with `admission_number = null` do not conflict — no special handling needed for nulls.

### HIGH-3: Student can have multiple active class enrollments
**File:** `backend/src/services/student.service.ts` — `assignStudentToClass`  
**Change:** Before creating/upserting the new enrollment, run:
```
updateMany({ where: { student_id, school_id, status: 'Active' }, data: { status: 'Inactive' } })
```
This ensures only one active enrollment exists at any time.

### HIGH-4: `removeStudentFromClass` deletes ALL enrollments
**File:** `backend/src/services/student.service.ts` lines 687–694  
**Change:** Add `class_id` to the `deleteMany` WHERE clause so only the specified class enrollment is removed.

### HIGH-5: Weak password entropy
**Files:** `backend/src/services/student.service.ts` line 41, `backend/src/services/auth.service.ts`  
**Change:** Replace `'student' + Math.floor(1000 + Math.random() * 9000)` with:
```ts
import crypto from 'crypto';
const generatedPassword = crypto.randomBytes(8).toString('hex'); // 16-char hex
```
Apply at both enrollment and approval code paths.

### HIGH-6: `getStudentByStudentId` not branch-scoped
**File:** `backend/src/services/student.service.ts` lines 829–834  
**Change:** Add `...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})` to the `findFirst` WHERE clause.

### HIGH-7: `getStudentsByClass` merges all branches
**File:** `backend/src/services/student.service.ts` line 1351  
**Change:** Add `...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})` to the `class.findFirst` WHERE clause used to resolve grade+section to a class ID.

---

## Wave 3 — UX & Medium Fixes (Frontend + backend, 1 schema migration)

### MED-1: `school_generated_id` not shown post-enrollment
**File:** `components/admin/AddStudentScreen.tsx`  
**Change:** In the `CredentialsModal`, extract `result.schoolGeneratedId || result.school_generated_id` from the enrollment response and display it as "Student ID" alongside email and password.

### MED-2: No status filter on student list
**File:** `components/admin/StudentListScreen.tsx`  
**Change:**
- Add a filter pill row: "All | Active | Pending | Withdrawn"
- Pass the selected status to `api.getStudents(schoolId, branchId, { status })`
- Add a status badge (green=Active, yellow=Pending, grey=Withdrawn) to each student row card

### MED-4: Profile read triggers DB write
**File:** `backend/src/services/student.service.ts` lines 706–734  
**Change:** Extract the identity-sync logic into a private `syncStudentIdentity(userId)` function. Call it only from `enrollStudent` and `approveStudent`. Remove from the `getStudentProfileByUserId` read path entirely.

### MED-5: Virtual class creation ignores `branch_id`
**File:** `backend/src/services/student.service.ts` line 253  
**Change:** Add `branch_id: branchId` to the `class.findFirst` query used when auto-creating/finding a class by grade+section during enrollment.

### MED-6: `Student.school_generated_id` no DB unique constraint
**File:** `backend/prisma/schema.prisma`  
**Change:** Add to `Student` model:
```prisma
@@unique([school_id, school_generated_id])
```
**Migration required.** Handle existing nulls (nullable field — unique constraint ignores nulls in PostgreSQL).

### MED-7: Hard delete instead of soft delete
**Files:** `backend/src/services/student.service.ts`, `backend/src/controllers/student.controller.ts`  
**Change:**
- `deleteStudent` sets `student.deleted_at = new Date()` and `user.deleted_at = new Date()` instead of calling `user.delete`.
- All `findMany` and `findFirst` queries for students add `deleted_at: null` to their WHERE clause.
- Admin UI shows a "Restore" option for deleted students (future, not in this wave — just the backend).

---

## Wave 4 — Missing Features (New endpoints + UI)

### F-1: Grade Promotion
**New endpoint:** `POST /api/students/:id/promote`  
**Body:** `{ newGrade, newSection, branchId?, session, term }`  
**Logic:**
1. Verify student belongs to caller's school.
2. Set all active `StudentEnrollment` records for the student to `status: 'Inactive'`.
3. Find or create the target class (grade + section + branch).
4. Create new `StudentEnrollment` with `status: 'Active'`.
5. Update `student.grade` and `student.section`.
6. Return updated student record.

**No ID regeneration** — the student keeps their existing `school_generated_id`.

### F-2: Withdrawal Workflow
**New endpoint:** `POST /api/students/:id/withdraw`  
**Body:** `{ reason, effectiveDate }`  
**Logic:**
1. Verify student belongs to caller's school.
2. Set `student.status = 'Withdrawn'` and `student.withdrawal_reason = reason` and `student.withdrawal_date = effectiveDate`.
3. Set all active `StudentEnrollment` records to `status: 'Inactive'`.
4. Do NOT delete any records.

**Schema addition:** Add `withdrawal_reason String?` and `withdrawal_date DateTime?` to the `Student` model.

### F-3: Automatic Class Rank Calculation
**New endpoint:** `POST /api/academic/calculate-rankings`  
**Body:** `{ classId, term, session }`  
**Logic:**
1. Query all `AcademicPerformance` rows for the class/term/session, grouped by student.
2. Sum scores per student.
3. Sort descending by total score.
4. Write `position_in_class` back to each `AcademicPerformance` row.
5. Return the ranked list.

**Permission:** Admin and teacher (class owner) only.

### F-4: Post-enrollment ID Display (MED-1 above already covers this)
Covered in Wave 3 MED-1.

---

## Implementation Order Within Each Wave

Each wave is a single PR. Within a wave, changes are ordered:
1. Schema migrations first (if any) — `npm run db:migrate`
2. Service layer changes
3. Controller layer changes
4. Frontend changes last

## Testing Checklist Per Wave

**Wave 1:**
- [ ] Enroll student → notification body has no password
- [ ] Call `getStudentStats` with a student_id from School B while authenticated as School A → 404 or empty
- [ ] Admin user calls `/api/students/me` → 403
- [ ] Teacher saves attendance for a class not assigned to them → 403
- [ ] Supply subject UUID from another school → 404

**Wave 2:**
- [ ] Create two students with same auto-generated email → second fails
- [ ] Enroll student → assign to Class A → assign to Class B → student has only one active enrollment
- [ ] Remove student from Class A → Class B enrollment is intact
- [ ] Generated password is 16 hex characters, not "studentXXXX"
- [ ] Try `PUT /api/students/:id` with `branch_id` in body → branch_id unchanged

**Wave 3:**
- [ ] Post-enrollment modal shows Student ID
- [ ] Status filter pill: select "Pending" → list shows only pending students
- [ ] Delete student → record exists with `deleted_at` set, does not appear in list

**Wave 4:**
- [ ] Promote student from Grade 5 to Grade 6 → new enrollment active, old enrollment inactive
- [ ] Withdraw student → status=Withdrawn, enrollments inactive, record not deleted
- [ ] Calculate rankings for a class → `position_in_class` set on each performance record
