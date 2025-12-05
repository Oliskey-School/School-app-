# Supabase Integration Guide for School Management App

## Current Issue
Your app is **NOT connected to Supabase** - it's using mock data from `data.ts` instead.

## What I've Done
1. ✅ Updated `lib/supabase.ts` to use environment variables
2. ✅ Created `lib/database.ts` - a service layer for fetching data from Supabase with automatic fallback to mock data

## Steps to Connect Your App to Supabase

### Step 1: Add Environment Variables
You need to add these variables to your `.env.local` file (which you have open):

```
VITE_SUPABASE_URL=https://nijgkstffuqxqltlmchu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamdrc3RmZnVxeHFsdGxtY2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjU3MzksImV4cCI6MjA4MDAwMTczOX0.3KQBB2WD9HUX3LYw_UtpLBAnzobky2WUoVSZjm_VtCo
```

### Step 2: Set Up Supabase Database Schema

Go to your Supabase project dashboard:
1. Navigate to https://supabase.com/dashboard/project/nijgkstffuqxqltlmchu
2. Click on "SQL Editor" in the left sidebar
3. Create a new query
4. Run the following SQL to create the basic tables:

```sql
-- Students Table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  grade INTEGER NOT NULL,
  section VARCHAR(10) NOT NULL,
  department VARCHAR(50),
  attendance_status VARCHAR(20) DEFAULT 'Absent',
  birthday DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parents Table
CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notices Table
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category VARCHAR(50) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  audience JSONB DEFAULT '[]'
);

-- Classes Table
CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(50) PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  grade INTEGER NOT NULL,
  section VARCHAR(10) NOT NULL,
  department VARCHAR(50),
  student_count INTEGER DEFAULT 0
);

-- Insert sample data
INSERT INTO students (name, avatar_url, grade, section, department, birthday) VALUES
('Adebayo Oluwaseun', 'https://i.pravatar.cc/150?u=adebayo', 10, 'A', 'Science', '2008-05-15'),
('Chidinma Okafor', 'https://i.pravatar.cc/150?u=chidinma', 10, 'A', 'Science', '2008-08-20'),
('Musa Ibrahim', 'https://i.pravatar.cc/150?u=musa', 9, 'A', NULL, '2009-02-10');
```

### Step 3: Update Your Components to Use Supabase

Instead of importing mock data directly, your components should use the new `database.ts` functions.

**Example - Update a component:**

Before (using mock data):
```typescript
import { mockStudents } from '../data';

function StudentList() {
  const students = mockStudents;
  // ...
}
```

After (using Supabase with fallback):
```typescript
import { fetchStudents } from '../lib/database';
import { useState, useEffect } from 'react';

function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudents() {
      const data = await fetchStudents();
      setStudents(data);
      setLoading(false);
    }
    loadStudents();
  }, []);

  if (loading) return <div>Loading...</div>;
  // ...
}
```

### Step 4: Test the Connection

After setting up the database, add this to your `App.tsx` to test the connection:

```typescript
import { checkSupabaseConnection } from './lib/database';

useEffect(() => {
  checkSupabaseConnection().then(connected => {
    if (connected) {
      console.log('✅ Supabase is connected!');
    } else {
      console.warn('⚠️ Supabase not connected, using mock data');
    }
  });
}, []);
```

## Available Database Functions

I've created these functions in `lib/database.ts`:

- `fetchStudents()` - Get all students
- `fetchTeachers()` - Get all teachers
- `fetchParents()` - Get all parents
- `fetchNotices()` - Get all notices/announcements
- `fetchClasses()` - Get all classes
- `fetchStudentById(id)` - Get a specific student
- `checkSupabaseConnection()` - Test if Supabase is connected

All functions automatically fall back to mock data if Supabase is not available!

## Why Your App Currently Doesn't Get Data from Supabase

1. The Supabase client exists but no components import or use it
2. All components directly import mock data from `data.ts`
3. The database tables don't exist in your Supabase project yet

## Next Steps

1. Add the environment variables to `.env.local`
2. Create the database schema in Supabase (use the SQL above)
3. Restart your dev server so it picks up the new env variables
4. Start updating components to use the database functions instead of mock data

The beauty of this approach is that your app will work with or without Supabase - it automatically falls back to mock data if the database isn't set up yet!
