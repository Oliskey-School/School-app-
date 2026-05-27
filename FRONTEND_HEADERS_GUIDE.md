# Frontend Integration Guide: Multi-Tenant Context Headers

This guide explains how the frontend should include school and branch context when making API calls to enforce multi-tenant isolation.

## Overview

The frontend must send school and branch identifiers in HTTP headers so the backend can:
1. Validate that the user is authorized for that school/branch
2. Set Postgres context for RLS policy enforcement
3. Prevent accidental cross-tenant data access

## Headers to Send

### 1. `X-School-Id` Header

**Required**: Yes (should always be sent)

**Value**: The school UUID the user is currently accessing

**Example:**
```typescript
const headers = {
    'Authorization': `Bearer ${token}`,
    'X-School-Id': currentSchool.id,  // Required
    'X-Branch-Id': currentBranch?.id, // Optional
    'Content-Type': 'application/json'
};
```

### 2. `X-Branch-Id` Header

**Required**: Only if the user's branch context should be enforced

**Value**: The branch UUID the user is currently accessing

**When to include:**
- User is in a single branch (student, branch admin, parent)
- Query should be scoped to a specific branch

**When NOT to include:**
- School-level admin viewing all branches
- Fetching school-wide data (announcements, fees)

## Integration Points

### 1. Update API Client (`lib/api.ts`)

The `HybridApiClient` should automatically include headers:

**Current approach (if needed):**
```typescript
// In lib/api.ts
async function apiCall(endpoint: string, options: RequestInit = {}) {
    const school_id = localStorage.getItem('current_school_id');
    const branch_id = localStorage.getItem('selected_branch_id');
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${getAuthToken()}`,
        'X-School-Id': school_id || '',
        ...(branch_id && { 'X-Branch-Id': branch_id })
    };

    return fetch(endpoint, {
        ...options,
        headers
    });
}
```

### 2. Update Context Providers

Ensure AuthContext and BranchContext properly store and retrieve school/branch IDs:

**AuthContext.tsx** (after login):
```typescript
// After successful login
localStorage.setItem('current_school_id', user.school_id);
setCurrentSchool(user.school);
```

**BranchContext.tsx** (on branch switch):
```typescript
// When user switches branch
const switchBranch = (branchId: string) => {
    localStorage.setItem('selected_branch_id', branchId);
    setCurrentBranchId(branchId);
    // Refresh data after branch switch
    refetchData();
};
```

### 3. Update Component API Calls

All components making API calls should include context headers:

**Before:**
```typescript
// Bad: No school/branch context
const response = await fetch('/api/students');
const data = await response.json();
```

**After:**
```typescript
// Good: Include school/branch headers
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

function StudentList() {
    const { currentSchool } = useAuth();
    const { currentBranchId } = useBranch();
    
    const getStudents = async () => {
        const headers = {
            'X-School-Id': currentSchool?.id,
            'X-Branch-Id': currentBranchId
        };
        
        const response = await fetch('/api/students', {
            headers,
            credentials: 'include'
        });
        return response.json();
    };
}
```

## Code Examples by Component Type

### Example 1: Dashboard Component (Admin)

```typescript
// components/admin/Dashboard.tsx
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

export function AdminDashboard() {
    const { currentSchool, isDemo } = useAuth();
    const { currentBranchId } = useBranch();

    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [currentBranchId]); // Refetch when branch changes

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/dashboard/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'X-School-Id': currentSchool?.id,
                    // Include X-Branch-Id for branch-specific stats
                    ...(currentBranchId && { 'X-Branch-Id': currentBranchId })
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch stats: ${response.status}`);
            }

            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    return (
        <div>
            <h1>Dashboard {isDemo ? '[DEMO]' : ''}</h1>
            {stats && <StatsCards stats={stats} />}
        </div>
    );
}
```

### Example 2: Student List Component

```typescript
// components/admin/StudentListScreen.tsx
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useCallback } from 'react';

export function StudentListScreen() {
    const { currentSchool } = useAuth();
    const { currentBranchId } = useBranch();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (!currentSchool?.id) return;

        setLoading(true);
        try {
            const url = new URL('/api/students', window.location.origin);
            
            // Include filters but let headers provide school/branch context
            url.searchParams.append('school_id', currentSchool.id);
            if (currentBranchId) {
                url.searchParams.append('branch_id', currentBranchId);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'X-School-Id': currentSchool.id,
                    'X-Branch-Id': currentBranchId || ''
                },
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 403) {
                    showError('You do not have access to this branch');
                    return;
                }
                throw new Error('Failed to load students');
            }

            const data = await response.json();
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
            showError(error.message);
        } finally {
            setLoading(false);
        }
    }, [currentSchool?.id, currentBranchId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    return (
        <StudentTable 
            students={students}
            loading={loading}
            onRefresh={fetchStudents}
        />
    );
}
```

### Example 3: Teacher View (Multi-Branch)

```typescript
// components/teacher/ClassAssignments.tsx
import { useAuth } from '../../context/AuthContext';

export function ClassAssignments() {
    const { currentSchool, user } = useAuth();
    const [assignments, setAssignments] = useState([]);

    // Teachers can access multiple branches
    // API will use user.allowed_branch_ids from JWT
    const fetchAssignments = async () => {
        try {
            const response = await fetch('/api/assignments', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'X-School-Id': currentSchool?.id,
                    // Don't send X-Branch-Id for teachers
                    // Backend will use allowed_branch_ids from JWT
                },
                credentials: 'include'
            });

            const data = await response.json();
            setAssignments(data);
        } catch (error) {
            console.error('Error fetching assignments:', error);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    return <AssignmentsList assignments={assignments} />;
}
```

### Example 4: Parent Portal (Multi-Branch Children)

```typescript
// components/parent/MyChildren.tsx
import { useAuth } from '../../context/AuthContext';

export function MyChildrenView() {
    const { currentSchool } = useAuth();
    const [children, setChildren] = useState([]);

    // Parent may have children in different branches
    // Backend will use allowed_branch_ids to show all children
    const fetchChildren = async () => {
        try {
            const response = await fetch('/api/parent/children', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'X-School-Id': currentSchool?.id,
                    // No X-Branch-Id header
                    // Backend returns all children across branches
                },
                credentials: 'include'
            });

            const data = await response.json();
            setChildren(data);
        } catch (error) {
            console.error('Error fetching children:', error);
        }
    };

    useEffect(() => {
        fetchChildren();
    }, []);

    return (
        <div>
            {children.map(child => (
                <ChildCard key={child.id} child={child} />
            ))}
        </div>
    );
}
```

## Branch Switching Flow

When a user switches branches, ensure:

1. Update localStorage: `selected_branch_id`
2. Update BranchContext: `setCurrentBranchId()`
3. Send `X-Branch-Id` header in subsequent requests
4. Refetch data that's branch-specific

**Example:**
```typescript
const switchBranch = async (branchId: string) => {
    // Update context
    setCurrentBranchId(branchId);
    localStorage.setItem('selected_branch_id', branchId);

    // Backend validates X-Branch-Id header matches allowed branches
    // If mismatch, request fails with 403

    // Refetch branch-specific data
    await Promise.all([
        fetchClasses(),
        fetchStudents(),
        fetchAttendance()
    ]);
};
```

## Demo Mode Considerations

In demo mode, ALL requests should automatically use the demo school ID:

```typescript
const { isDemo, currentSchool } = useAuth();

// In API calls:
const schoolId = isDemo 
    ? 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' 
    : currentSchool?.id;

const headers = {
    'X-School-Id': schoolId,
    // Demo users can switch roles without re-authenticating
    // Each role has its own branch context
};
```

## Error Handling

Backend will return specific errors for header mismatches:

```typescript
// 403 - Header does not match authenticated user's context
{
    "status": 403,
    "message": "School header does not match authenticated school"
}

// 403 - User not authorized for requested branch
{
    "status": 403,
    "message": "User not authorized to access this branch"
}

// 400 - Missing required header
{
    "status": 400,
    "message": "X-School-Id header required"
}
```

Handle these in your API client:

```typescript
async function apiCall(url: string, options: RequestInit = {}) {
    const response = await fetch(url, options);
    
    if (response.status === 403) {
        const error = await response.json();
        console.error('Access denied:', error.message);
        // Redirect to unauthorized page or show message
        showAuthorizationError(error.message);
    }

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
```

## Testing Headers

Use browser DevTools to verify headers are being sent:

1. Open DevTools → Network tab
2. Make an API call
3. Click the request
4. Go to Request Headers
5. Verify `X-School-Id` and `X-Branch-Id` are present

Or use curl:
```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-School-Id: school-123" \
     -H "X-Branch-Id: branch-abc" \
     http://localhost:5000/api/students
```

## Summary

✅ Always send `X-School-Id` header  
✅ Send `X-Branch-Id` when user is in a single branch  
✅ Don't send `X-Branch-Id` for school admins or multi-branch users  
✅ Update localStorage when school/branch changes  
✅ Refetch data after branch switches  
✅ Handle 403 errors gracefully  
✅ Include credentials: 'include' for cookie-based auth

---

**Next Steps:**
1. Update `lib/api.ts` to include headers automatically
2. Test API calls in browser to verify headers are sent
3. Monitor backend logs to confirm header validation is working
4. Add integration tests for multi-branch workflows
