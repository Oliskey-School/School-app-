# Service Layer Migration Guide: Multi-Tenant Query Scoping

This guide explains how to update backend services to use the new query scoping utilities for enforcing multi-school and multi-branch isolation.

## Overview

Instead of manually adding `school_id` and `branch_id` filters to each Prisma query, services should now use the scoping wrapper functions from `utils/queryScope.ts`. This:

✅ Ensures consistent isolation across all services  
✅ Prevents accidental data leaks from missing filters  
✅ Makes code more readable and maintainable  
✅ Enables centralized audit logging in the future  

## Available Scoping Functions

### 1. `withSchoolScope()` — School-Level Isolation Only

Use for tables that have `school_id` but not `branch_id`, or when you need school-wide data.

**When to use:**
- Fee, Payment, Payment, Receipt management
- School-level announcements
- School-wide reports
- Exams and Results (school-level)

**Example:**
```typescript
import { withSchoolScope } from '../utils/queryScope';

async function getSchoolFees(req: AuthRequest) {
    const fees = await withSchoolScope(req, prisma.fee.findMany)({
        where: { is_active: true },
        include: { students: true }
    });
    return fees;
}
// Automatically filters: where.school_id = req.school_id
```

### 2. `withSchoolBranchScope()` — School + Branch Isolation

Use for tables with both `school_id` and `branch_id`. Most data tables fall into this category.

**When to use:**
- Students, Teachers, Parents, Classes
- Attendance, Assignments, Grades
- Timetables, Virtual Classes
- Hostel allocations, Transport routes

**Example:**
```typescript
import { withSchoolBranchScope } from '../utils/queryScope';

async function getClassStudents(req: AuthRequest, classId: string) {
    const students = await withSchoolBranchScope(req, prisma.studentEnrollment.findMany)({
        where: { classId },
        include: { student: true }
    });
    return students;
}
// Automatically filters: where.school_id = req.school_id AND where.branch_id = req.branch_id
```

**Admin Exception (cross-branch):**
If a school admin needs to see all branches:
```typescript
async function getAllClasses(req: AuthRequest) {
    // Pass `true` as third parameter to skip branch filter
    const allClasses = await withSchoolBranchScope(req, prisma.class.findMany, true)({
        where: {},
        orderBy: { name: 'asc' }
    });
    return allClasses;
}
// Filters: where.school_id = req.school_id (no branch_id filter)
```

### 3. `withSchoolMultiBranchScope()` — Multi-Branch Users

Use when a user can access multiple branches (e.g., teacher assigned to multiple branches, parent with children in different branches).

**When to use:**
- Teachers viewing assignments across their branches
- Parents viewing children's data across multiple branches
- Cross-branch reporting

**Example:**
```typescript
import { withSchoolMultiBranchScope } from '../utils/queryScope';

async function getTeacherAssignments(req: AuthRequest) {
    // Teacher may have allowed_branch_ids = ['branch-a', 'branch-b']
    const assignments = await withSchoolMultiBranchScope(req, prisma.assignment.findMany)({
        where: { isPublished: true }
    });
    // Filters: school_id + (branch_id IN user.allowed_branch_ids)
    return assignments;
}
```

### 4. `withSchoolScopeCreate()` — Scoped Create Operations

Use when creating new records to auto-populate `school_id` (and optionally `branch_id`).

**When to use:**
- Creating any new tenant-scoped record

**Example:**
```typescript
import { withSchoolScopeCreate } from '../utils/queryScope';

async function createStudent(req: AuthRequest, data: CreateStudentDTO) {
    const student = await withSchoolScopeCreate(req, prisma.student.create, true)({
        data: {
            full_name: data.full_name,
            email: data.email,
            // Don't include school_id or branch_id — they're auto-populated
        },
        include: { user: true }
    });
    return student;
}
// Auto-sets: data.school_id = req.school_id, data.branch_id = req.branch_id
```

### 5. `withSchoolScopeUpdate()` — Scoped Update Operations

Use when updating records to enforce that only records in the user's school/branch can be modified.

**When to use:**
- Updating student information
- Marking attendance
- Publishing grades

**Example:**
```typescript
import { withSchoolScopeUpdate } from '../utils/queryScope';

async function updateStudentGrade(req: AuthRequest, studentId: string, grade: number) {
    const updated = await withSchoolScopeUpdate(req, prisma.student.update, true)({
        where: { id: studentId },
        data: { grade },
        include: { academicPerformance: true }
    });
    return updated;
}
// Auto-enforces: where.school_id = req.school_id AND where.branch_id = req.branch_id
// This prevents updating a student from a different school/branch
```

### 6. `validateRecordScope()` — Post-Query Validation

Use for `findUnique()` or `findFirst()` to ensure returned records belong to the user's school/branch.

**When to use:**
- After fetching a single record by ID
- To prevent accidental exposure of cross-school data

**Example:**
```typescript
import { validateRecordScope } from '../utils/queryScope';

async function getStudentDetail(req: AuthRequest, studentId: string) {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { parents: true, classes: true }
    });

    // Validate that this student belongs to the requesting user's school
    validateRecordScope(req, student, true); // true = include branch check
    
    return student;
}
// Throws error if student.school_id !== req.school_id or student.branch_id !== req.branch_id
```

### 7. `safeFetch()` — Automatic Validation

Combines query execution with automatic scope validation.

**When to use:**
- Simpler alternative to separate query + validation

**Example:**
```typescript
import { safeFetch } from '../utils/queryScope';

async function getStudentDetail(req: AuthRequest, studentId: string) {
    const student = await safeFetch(req, () =>
        prisma.student.findUnique({
            where: { id: studentId },
            include: { parents: true }
        }),
        true // validate branch as well
    );
    return student;
}
// Automatically validates scope; throws if mismatch
```

### 8. `getTenantContext()` — Extract Context for Logging

Get a clean tenant context object for audit logging or debugging.

**Example:**
```typescript
import { getTenantContext } from '../utils/queryScope';

async function createAttendanceRecord(req: AuthRequest, data: AttendanceDTO) {
    const context = getTenantContext(req);
    console.log(`Creating attendance in ${context.school_id} / ${context.branch_id} by ${context.user_role}`);
    
    // ... create record
}
```

## Migration Checklist

### Step 1: Identify Affected Services

Services in `/backend/src/services/` that need updates:

- `admin.service.ts` — School/branch management
- `student.service.ts` — Student operations (HIGH PRIORITY)
- `teacher.service.ts` — Teacher operations (HIGH PRIORITY)
- `attendance.service.ts` — Attendance tracking (HIGH PRIORITY)
- `academic.service.ts` — Grades, reports
- `class.service.ts` — Class management
- `exam.service.ts` — Exam operations
- `payment.service.ts` — Fee/payment operations
- `notification.service.ts` — School-wide messaging
- All other services in the directory

### Step 2: Update Each Service

For each service, follow this pattern:

**Before:**
```typescript
async function getStudents(req: AuthRequest, filters?: any) {
    // Manual school_id and branch_id filtering
    const students = await prisma.student.findMany({
        where: {
            school_id: req.user?.school_id,  // ❌ Manual, error-prone
            branch_id: req.user?.branch_id,  // ❌ Can be forgotten
            ...filters
        }
    });
    return students;
}
```

**After:**
```typescript
import { withSchoolBranchScope } from '../utils/queryScope';

async function getStudents(req: AuthRequest, filters?: any) {
    // Automatic school_id and branch_id filtering
    const students = await withSchoolBranchScope(req, prisma.student.findMany)({
        where: filters || {},
        // Already includes: school_id = req.school_id, branch_id = req.branch_id
    });
    return students;
}
```

### Step 3: Test Each Update

Run tests after updating services:

```bash
# Run specific service tests
npm run test:run backend/tests/integration/student.test.ts

# Run all integration tests
npm run test:run backend/tests/integration/
```

### Step 4: Verify No Regression

Spot-check via API:

```bash
# Admin should see their branch's data
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-School-Id: school-123" \
     http://localhost:5000/api/students

# Should be denied if trying to see other branch
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Branch-Id: other-branch" \
     http://localhost:5000/api/classes/class-xyz
# Expected: 403 Forbidden
```

## Common Patterns

### Pattern 1: List with Filters (Most Common)

```typescript
async function listStudents(
    req: AuthRequest,
    filters: { grade?: number; section?: string } = {}
) {
    return withSchoolBranchScope(req, prisma.student.findMany)({
        where: filters,
        include: { parents: true },
        orderBy: { full_name: 'asc' }
    });
}
```

### Pattern 2: Create with Auto-Population

```typescript
async function enrollStudent(req: AuthRequest, data: EnrollmentData) {
    return withSchoolScopeCreate(req, prisma.student.create, true)({
        data: {
            full_name: data.full_name,
            email: data.email,
            grade: data.grade
            // school_id and branch_id auto-populated
        },
        include: { user: true, enrollments: true }
    });
}
```

### Pattern 3: Single Record with Validation

```typescript
async function getStudentById(req: AuthRequest, studentId: string) {
    return safeFetch(req, 
        () => prisma.student.findUnique({
            where: { id: studentId },
            include: { parents: true, classes: true }
        }),
        true // validate branch
    );
}
```

### Pattern 4: Update with Scope Enforcement

```typescript
async function updateStudentProfile(
    req: AuthRequest,
    studentId: string,
    updates: Partial<StudentDTO>
) {
    return withSchoolScopeUpdate(req, prisma.student.update, true)({
        where: { id: studentId },
        data: updates,
        include: { parents: true }
    });
}
```

### Pattern 5: Multi-Branch User Query

```typescript
async function getParentChildren(req: AuthRequest) {
    // Parent may have children in different branches
    return withSchoolMultiBranchScope(req, prisma.parentChild.findMany)({
        where: { parentId: req.user?.id },
        include: { student: { include: { classes: true } } }
    });
}
```

## Validation & Testing

### Automated Test Template

```typescript
describe('Student Service - Isolation', () => {
    it('should filter students by school and branch', async () => {
        const req = {
            school_id: 'school-a',
            branch_id: 'branch-main',
            user: { allowed_branch_ids: ['branch-main'] }
        } as AuthRequest;

        const students = await studentService.getStudents(req);
        
        // Verify all returned students are in school-a, branch-main
        students.forEach(student => {
            expect(student.school_id).toBe('school-a');
            expect(student.branch_id).toBe('branch-main');
        });
    });

    it('should prevent updating student from other school', async () => {
        const req = {
            school_id: 'school-a',
            branch_id: 'branch-main'
        } as AuthRequest;

        const otherSchoolStudentId = 'student-from-school-b';

        expect(async () => {
            await studentService.updateStudent(req, otherSchoolStudentId, { grade: 11 });
        }).rejects.toThrow();
    });
});
```

## RLS Policies + App-Level Scoping

The scoping wrappers work in tandem with Prisma-enforced scoping:

1. **RLS (Database Layer)**: Enforces isolation if someone directly queries the database
2. **Query Scoping (App Layer)**: Prevents queries from ever requesting cross-tenant data

Both must be in place for defense-in-depth.

## Troubleshooting

### Issue: Missing school_id Error

**Error message:** `Missing school_id in request context`

**Solution:** Ensure the `authenticate` middleware is applied to the route:
```typescript
router.get('/students', authenticate, studentController.getStudents);
```

### Issue: Branch Filtering Not Working

**Error message:** `User not authorized to access this branch` or records from other branches returned

**Solution:** Verify you're using the correct scoping function:
- For single branch: `withSchoolBranchScope()`
- For multi-branch users: `withSchoolMultiBranchScope()`

### Issue: Admin Cannot See All Branches

**Solution:** Pass `true` as third parameter:
```typescript
const allClasses = await withSchoolBranchScope(req, prisma.class.findMany, true)({...});
// Now school_id is filtered but not branch_id
```

## Summary

| Function | Use Case | Filters |
|----------|----------|---------|
| `withSchoolScope()` | School-wide data | `school_id` only |
| `withSchoolBranchScope()` | Branch data (single branch) | `school_id` + `branch_id` |
| `withSchoolBranchScope(true)` | Admin seeing all branches | `school_id` only |
| `withSchoolMultiBranchScope()` | User with multi-branch access | `school_id` + branch_id IN allowed |
| `withSchoolScopeCreate()` | Create new record | Auto-populate school/branch |
| `withSchoolScopeUpdate()` | Update with scope check | Enforce school/branch in WHERE |
| `validateRecordScope()` | Validate single record | Check school_id/branch_id match |
| `safeFetch()` | Fetch + validate | Combined operation |

---

## Next Steps

1. Update all services to use scoping wrappers (see list above)
2. Run integration tests: `npm run test:run backend/tests/integration/`
3. Monitor API calls and verify no cross-tenant data leaks
4. Add this guide to team documentation

Questions? Reach out to the DevSecOps team.
