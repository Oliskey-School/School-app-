# Timetable Publishing System - Implementation Guide

## Overview
This implementation adds a complete timetable publishing workflow where:
- **Admins** can create, edit, and publish timetables
- **Teachers** can view published timetables for subjects they teach
- **Students** can view published timetables for their class

## Database Changes

### 1. Migration SQL
Run the migration file: `sql/add_timetable_status.sql`

This adds:
- `status` column (VARCHAR) - tracks 'Draft' or 'Published' state
- `created_at` and `updated_at` timestamps
- Indexes for better query performance

```sql
-- Run this in your Supabase SQL editor
-- File: sql/add_timetable_status.sql
```

## Key Features

### Admin Functionality

#### 1. **Timetable Overview Screen** (`components/admin/TimetableScreen.tsx`)
- Shows all timetables across all classes
- Filter by status: All, Published, or Draft
- Quick view of:
  - Class name
  - Status (Published/Draft)
  - Total periods per week
  - Last updated date
- Actions:
  - Create new timetable
  - View existing timetable
  - Edit timetable

#### 2. **Timetable Editor** (`components/admin/TimetableEditor.tsx`)
Enhanced with Supabase integration:

**Save as Draft:**
- Saves timetable to database with status = 'Draft'
- Not visible to teachers or students
- Can be edited further

**Publish:**
- Saves timetable to database with status = 'Published'
- Immediately visible to:
  - Teachers assigned to subjects
  - Students in that class
- Shows success message: "Timetable published! Now visible to teachers and students."

**Data Persistence:**
- Automatically finds teacher IDs from teacher names
- Deletes old entries before saving (prevents duplicates)
- Saves all periods with proper time slots
- Links teachers to their assigned periods

### Teacher Functionality

#### **Timetable View** (`components/shared/TimetableScreen.tsx`)
Teachers see:
- Only **published** timetables
- Only periods where they are assigned
- Class names for each period
- Week view and Day view options
- Real-time current time indicator

**Query Logic:**
```typescript
.from('timetable')
.select('*')
.eq('teacher_id', context.userId)
.eq('status', 'Published')  // Only published!
```

### Student Functionality

#### **Timetable View** (`components/shared/TimetableScreen.tsx`)
Students see:
- Only **published** timetables
- Only their class timetable (matched by grade + section)
- Subject names and times
- Week view and Day view options
- Real-time current time indicator

**Query Logic:**
```typescript
.from('timetable')
.select('*')
.ilike('class_name', `%${grade}${section}%`)
.eq('status', 'Published')  // Only published!
```

## Workflow Example

### Scenario: Creating a Grade 10A Timetable

1. **Admin creates timetable:**
   - Navigate to Timetable Management
   - Click "Create New Timetable"
   - Use AI generator or manual entry
   - Assign subjects to periods
   - Teachers auto-assigned based on subjects

2. **Admin saves as draft:**
   - Click "Save Changes"
   - Timetable saved with status = 'Draft'
   - Not visible to teachers/students yet
   - Admin can continue editing

3. **Admin publishes:**
   - Click "Publish"
   - Status changes to 'Published'
   - Database updated
   - Success message shown

4. **Teachers see it:**
   - Math teacher logs in
   - Opens Timetable
   - Sees only their Math periods
   - Shows class names (e.g., "Grade 10A")

5. **Students see it:**
   - Grade 10A student logs in
   - Opens Timetable
   - Sees complete weekly schedule
   - All subjects and times visible

## Technical Implementation Details

### Database Schema
```sql
timetable (
  id SERIAL PRIMARY KEY,
  day VARCHAR(20),           -- Monday, Tuesday, etc.
  start_time VARCHAR(10),    -- 09:00
  end_time VARCHAR(10),      -- 09:45
  subject VARCHAR(100),      -- Mathematics
  class_name VARCHAR(50),    -- Grade 10A
  teacher_id INTEGER,        -- FK to teachers table
  status VARCHAR(20),        -- Draft or Published
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Period Structure
```typescript
const PERIODS = [
  { name: 'Period 1', start: '09:00', end: '09:45' },
  { name: 'Period 2', start: '09:45', end: '10:30' },
  { name: 'Period 3', start: '10:30', end: '11:15' },
  { name: 'Short Break', start: '11:15', end: '11:30', isBreak: true },
  { name: 'Period 4', start: '11:30', end: '12:15' },
  { name: 'Period 5', start: '12:15', end: '13:00' },
  { name: 'Long Break', start: '13:00', end: '13:45', isBreak: true },
  { name: 'Period 6', start: '13:45', end: '14:30' },
  { name: 'Period 7', start: '14:30', end: '15:15' },
  { name: 'Period 8', start: '15:15', end: '16:00' },
];
```

### Data Flow

**Admin Publishes:**
```
TimetableEditor
  ↓
handlePublish()
  ↓
saveTimetableToDatabase('Published')
  ↓
Delete old entries for class
  ↓
Convert timetable object to array
  ↓
Find teacher IDs
  ↓
Insert entries with status='Published'
  ↓
Supabase Database
```

**Teacher/Student Views:**
```
TimetableScreen
  ↓
fetchData()
  ↓
Query with .eq('status', 'Published')
  ↓
Filter by teacher_id OR class_name
  ↓
Display in Week/Day view
```

## Security Considerations

1. **Row Level Security (RLS):**
   - Currently disabled for development
   - In production, add policies:
     - Admins: Full access
     - Teachers: Read published timetables where teacher_id matches
     - Students: Read published timetables where class matches

2. **Status Validation:**
   - Only admins can change status
   - Status must be 'Draft' or 'Published'
   - Published timetables should be immutable (or require unpublish first)

## Future Enhancements

1. **Unpublish Feature:**
   - Allow admins to unpublish timetables
   - Useful for corrections

2. **Version History:**
   - Track changes to timetables
   - Allow rollback to previous versions

3. **Notifications:**
   - Notify teachers when assigned to new periods
   - Notify students when class timetable published

4. **Conflict Detection:**
   - Warn if teacher assigned to multiple classes same time
   - Check room availability

5. **Bulk Operations:**
   - Publish multiple timetables at once
   - Copy timetable from one class to another

## Testing Checklist

- [ ] Run migration SQL in Supabase
- [ ] Create a test timetable as admin
- [ ] Save as draft - verify not visible to others
- [ ] Publish timetable - verify status changes
- [ ] Login as teacher - verify can see assigned periods
- [ ] Login as student - verify can see class timetable
- [ ] Edit published timetable - verify updates work
- [ ] Create timetable for multiple classes
- [ ] Test filter tabs in overview screen
- [ ] Verify teacher assignment works correctly

## Troubleshooting

**Teachers can't see timetable:**
- Check teacher_id is correctly assigned in database
- Verify status = 'Published'
- Check teacher is logged in with correct ID

**Students can't see timetable:**
- Verify class_name matches pattern (e.g., "Grade 10A" or "10A")
- Check status = 'Published'
- Verify student's grade and section are correct

**Publish fails:**
- Check Supabase connection
- Verify teachers table has matching names
- Check console for error messages
- Ensure status column exists in database

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database schema matches expected structure
3. Test queries directly in Supabase SQL editor
4. Review network tab for failed API calls
