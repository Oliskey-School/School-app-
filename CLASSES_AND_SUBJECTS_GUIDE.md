# Classes and Subjects Database Integration Guide

## 🎯 Overview
This guide explains how to get classes and subjects working with the database instead of mock data.

## ✅ What Has Been Done

### 1. Created `useClasses` Hook
Location: `lib/hooks/useClasses.ts`

This hook provides:
- **Real-time class data** from Supabase
- **Automatic fallback** - Generates default classes for grades 7-12 if Supabase is not configured
- **CRUD operations** - Create, Read, Update, Delete classes
- **Real-time updates** - Automatically refreshes when data changes

### 2. Created SQL Script to Populate Classes
Location: `sql/populate_classes.sql`

This script creates:
- **Junior Secondary** (Grades 7-9): General classes for sections A, B, C
- **Senior Secondary** (Grades 10-12): Science, Arts, and Commercial departments for sections A, B, C
- **Total**: 45 classes covering all grades and departments

## 📋 How to Set Up Classes in Database

### Step 1: Run the SQL Script in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy the contents of `sql/populate_classes.sql`
5. Paste and click **Run**

This will create all classes in your database.

### Step 2: Verify Classes Were Created

Run this query in Supabase SQL Editor:
```sql
SELECT * FROM classes ORDER BY grade, section, subject;
```

You should see 45 classes.

### Step 3: Update Components to Use `useClasses` Hook

#### Example: Update a Component

**BEFORE** (using mock data):
```typescript
import { mockClasses } from '../../data';

function MyComponent() {
  const classes = mockClasses;
  
  return (
    <div>
      {classes.map(cls => (
        <div key={cls.id}>{cls.subject} - Grade {cls.grade}{cls.section}</div>
      ))}
    </div>
  );
}
```

**AFTER** (using real-time database):
```typescript
import { useClasses } from '../../lib/hooks';

function MyComponent() {
  const { classes, loading, error } = useClasses();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {classes.map(cls => (
        <div key={cls.id}>{cls.subject} - Grade {cls.grade}{cls.section}</div>
      ))}
    </div>
  );
}
```

## 🔧 Components That Need Updating

### High Priority (Classes Display):
1. **`ClassListScreen.tsx`** - Admin class management
2. **`TeacherCurriculumSelectionScreen.tsx`** - Teacher class selection
3. **`TeacherCommunicationScreen.tsx`** - Teacher communication
4. **`AttendanceOverviewScreen.tsx`** - Attendance overview
5. **`TeacherDetailAdminView.tsx`** - Teacher details

### How to Update Each Component:

1. **Import the hook**:
   ```typescript
   import { useClasses } from '../../lib/hooks';
   ```

2. **Replace mock data**:
   ```typescript
   // Remove: import { mockClasses } from '../../data';
   // Add:
   const { classes, loading, error } = useClasses();
   ```

3. **Add loading/error states**:
   ```typescript
   if (loading) return <LoadingSpinner />;
   if (error) return <ErrorMessage error={error} />;
   ```

4. **Use the `classes` data** as you would use `mockClasses`

## 📊 Subject Management

### Subjects for Each Department:

**Junior Secondary (Grades 7-9)**:
- Mathematics
- English
- Basic Science
- Basic Technology
- Social Studies
- Civic Education

**Senior Secondary - Science (Grades 10-12)**:
- Mathematics
- English
- Physics
- Chemistry
- Biology
- Civic Education

**Senior Secondary - Arts (Grades 10-12)**:
- Mathematics
- English
- Literature
- Government
- History
- Civic Education

**Senior Secondary - Commercial (Grades 10-12)**:
- Mathematics
- English
- Accounting
- Commerce
- Economics
- Civic Education

### Getting Subjects for a Student:

The function `getSubjectsForStudent()` in `data.ts` already handles this correctly based on grade and department.

## 🔄 Real-Time Features

### Automatic Updates:
When you use `useClasses()`, the component will automatically update when:
- A new class is created
- A class is updated
- A class is deleted
- Student count changes

No page refresh needed!

### Example: Creating a New Class

```typescript
const { createClass } = useClasses();

const handleCreateClass = async () => {
  const newClass = await createClass({
    id: '13A-Science',
    subject: 'Science',
    grade: 13,
    section: 'A',
    department: 'Science',
    student_count: 0
  });
  
  // UI updates automatically!
};
```

## 🎓 Subject-Specific Classes

If you need to filter classes by subject or grade:

```typescript
// Get only Grade 10 classes
const { classes } = useClasses({ grade: 10 });

// Get only Section A classes
const { classes } = useClasses({ section: 'A' });

// Get Grade 10, Section A classes
const { classes } = useClasses({ grade: 10, section: 'A' });
```

## ⚠️ Important Notes

1. **Fallback Behavior**: If Supabase is not configured, `useClasses()` will automatically generate default classes for all grades
2. **Student Count**: The `student_count` field is automatically updated when students are assigned to classes
3. **Class IDs**: Format is `{grade}{section}-{subject}` (e.g., "10A-Science")
4. **Departments**: Only for grades 10-12 (Science, Arts, Commercial)

## 🚀 Quick Start Checklist

- [ ] Run `sql/populate_classes.sql` in Supabase
- [ ] Verify classes exist in database
- [ ] Update `ClassListScreen.tsx` to use `useClasses()`
- [ ] Update `TeacherCurriculumSelectionScreen.tsx` to use `useClasses()`
- [ ] Update other components that use `mockClasses`
- [ ] Test real-time updates
- [ ] Verify subjects display correctly for each department

## 📝 Summary

You now have:
✅ A `useClasses()` hook for real-time class data
✅ SQL script to populate all classes
✅ Automatic fallback if database is unavailable
✅ Real-time updates without page refresh
✅ Proper subject organization by department

Next step: Update your components to use `useClasses()` instead of `mockClasses`! 🎉
