# Real-Time Database Integration Implementation Plan

## Overview
This document outlines the plan to migrate the entire application from mock data to real-time Supabase database integration.

## Current Status
✅ Supabase is configured and connected
✅ Some components already use Supabase (DashboardOverview, AddStudentScreen, AddTeacherScreen, AddParentScreen)
❌ Most components still use mock data from `data.ts`

## Implementation Strategy

### Phase 1: Core Data Hooks (Priority: HIGH)
Create custom React hooks for real-time data fetching and mutations:

1. **`useStudents()`** - Fetch and subscribe to students table
2. **`useTeachers()`** - Fetch and subscribe to teachers table
3. **`useParents()`** - Fetch and subscribe to parents table
4. **`useClasses()`** - Fetch and subscribe to classes table
5. **`useTimetable()`** - Fetch and subscribe to timetable data
6. **`useAssignments()`** - Fetch and subscribe to assignments
7. **`useAttendance()`** - Fetch and subscribe to attendance records
8. **`useFees()`** - Fetch and subscribe to fee records
9. **`useMessages()`** - Fetch and subscribe to chat messages
10. **`useNotifications()`** - Fetch and subscribe to notifications

### Phase 2: Admin Module (Priority: HIGH)
Components to update:
- ✅ DashboardOverview (Already using Supabase)
- ✅ AddStudentScreen (Already using Supabase)
- ✅ AddTeacherScreen (Already using Supabase)
- ✅ AddParentScreen (Already using Supabase)
- ❌ StudentListScreen
- ❌ TeacherListScreen
- ❌ ParentListScreen
- ❌ ClassListScreen
- ❌ StudentProfileAdminView
- ❌ TeacherDetailAdminView
- ❌ ParentDetailAdminView
- ❌ FeeManagement
- ❌ ExamManagement
- ❌ AttendanceOverviewScreen
- ❌ ClassAttendanceDetailScreen
- ❌ TeacherAttendanceScreen
- ❌ HealthLogScreen
- ❌ BusDutyRosterScreen
- ❌ TimetableGeneratorScreen
- ❌ ReportCardPublishing
- ❌ CommunicationHub
- ❌ UserAccountsScreen

### Phase 3: Teacher Module (Priority: MEDIUM)
Components to update:
- ❌ TeacherDashboard
- ❌ TeacherAttendanceScreen
- ❌ CreateAssignmentScreen
- ❌ ReportCardInputScreen
- ❌ ClassDetailScreen
- ❌ VirtualClassScreen
- ❌ TeacherAppointmentsScreen
- ❌ NewChatScreen

### Phase 4: Parent Module (Priority: MEDIUM)
Components to update:
- ❌ ParentDashboard
- ❌ AlertsScreen
- ❌ ParentNewChatScreen

### Phase 5: Student Module (Priority: MEDIUM)
Components to update:
- ❌ StudentDashboard
- ❌ SubjectsScreen
- ❌ StudentProfileScreen
- ❌ ClassroomScreen
- ❌ AcademicReportScreen
- ❌ StudentCBTListScreen
- ❌ Games (MathSprintGameScreen, GamesHubScreen)

### Phase 6: Shared Components (Priority: LOW)
Components to update:
- ❌ GlobalSearchScreen
- ❌ NotificationsScreen
- ❌ MessagingLayout
- ❌ ChatScreen

## Technical Implementation Details

### 1. Custom Hooks Pattern
```typescript
// Example: hooks/useStudents.ts
export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchStudents();

    // Real-time subscription
    const channel = supabase
      .channel('students-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'students' },
        handleChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { students, loading, error, refetch: fetchStudents };
}
```

### 2. Mutation Hooks Pattern
```typescript
// Example: hooks/useCreateStudent.ts
export function useCreateStudent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createStudent = async (data: StudentInput) => {
    setLoading(true);
    try {
      const { data: student, error } = await supabase
        .from('students')
        .insert([data])
        .select()
        .single();
      
      if (error) throw error;
      return student;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createStudent, loading, error };
}
```

### 3. Real-time Subscription Strategy
- Use Supabase Realtime for all tables
- Implement optimistic updates for better UX
- Handle conflicts and errors gracefully
- Show loading states during operations

### 4. Data Caching Strategy
- Use React Query or SWR for advanced caching (optional)
- Implement local state management with Context API
- Cache frequently accessed data in memory

## Database Schema Requirements

### Tables Needed (Already exist in SQL files):
- ✅ students
- ✅ teachers
- ✅ parents
- ✅ classes
- ✅ timetable
- ✅ assignments
- ✅ student_attendance
- ✅ teacher_attendance
- ✅ student_fees
- ✅ health_logs
- ✅ bus_roster
- ✅ report_cards
- ✅ notifications
- ✅ chat_rooms
- ✅ chat_messages
- ✅ cbt_tests
- ✅ exam_schedules

### Real-time Enablement
Run this SQL to enable real-time on all tables:
```sql
-- Already exists in sql/enable_realtime.sql
```

## Migration Steps

### Step 1: Create Hooks Directory
Create `lib/hooks/` directory with all custom hooks

### Step 2: Migrate Admin Components
Start with high-priority admin components that manage data

### Step 3: Migrate Dashboard Components
Update all dashboard overview screens

### Step 4: Migrate List/Detail Views
Update all list and detail view components

### Step 5: Migrate Forms
Update all create/edit forms

### Step 6: Testing
- Test all CRUD operations
- Verify real-time updates work
- Test error handling
- Test loading states

## Success Criteria
✅ All components fetch data from Supabase
✅ Real-time updates work without page refresh
✅ All CRUD operations persist to database
✅ Proper error handling and loading states
✅ No mock data dependencies
✅ Optimistic updates for better UX

## Timeline Estimate
- Phase 1 (Hooks): 2-3 hours
- Phase 2 (Admin): 4-5 hours
- Phase 3 (Teacher): 2-3 hours
- Phase 4 (Parent): 2-3 hours
- Phase 5 (Student): 2-3 hours
- Phase 6 (Shared): 1-2 hours
- Testing: 2-3 hours

**Total: 15-22 hours**

## Next Steps
1. Create custom hooks in `lib/hooks/`
2. Start with StudentListScreen migration
3. Test real-time functionality
4. Continue with other components systematically
