
# Parent-Child Linking Implementation Walkthrough

## Overview
We have implemented the functionality to ensure that when a parent is linked to a student (or vice versa), this relationship is reflected in both:
1.  **Parent Dashboard**: The parent can see their linked child.
2.  **Student Profile**: The student can see their linked parent (guardian).

## Changes Made

### 1. Database Helper (`lib/database.ts`)
*   Added `fetchParentsForStudent(studentId: number)`: A new function that queries the `parent_children` table to find all parents linked to a specific student ID, and then fetches their details from the `parents` table.

### 2. Student Profile (`components/student/StudentProfileScreen.tsx`)
*   Updated to import `fetchParentsForStudent`.
*   Added state `parents` to store the fetched guardians.
*   Added a `useEffect` hook to fetch the guardians when the component mounts or `studentId` changes.
*   Added a UI section "Guardians" to the left sidebar of the profile screen. This section lists the linked parents with their avatar, name, and contact info (phone or email).

## Verification Steps

### Step 1: Link a Parent and Student
1.  Log in as **Admin**.
2.  Go to **User Accounts**.
3.  Click **Add New Student** (or Edit an existing one).
4.  In the "Guardian Info" section, enter the email of a Parent user (existing or new).
    *   *Tip: Use an existing parent email to easily link.*
5.  Save the student.

### Step 2: Verify Parent Dashboard
1.  Log in as the **Parent** you just linked.
2.  On the **Parent Dashboard**, you should see the student listed under "My Children" or in the child selector.
3.  *Note: This functionality was already present, but verifying it confirms the link is active in the database.*

### Step 3: Verify Student Profile
1.  Log in as the **Student** you just linked.
2.  Go to the **"My Profile"** screen (usually via the bottom navigation "Profile" tab or avatar click).
3.  Look at the left sidebar (under the student's avatar and grade info).
4.  You should see a new **"Guardians"** section listing the linked parent(s).

## Troubleshooting
*   **Don't see the parent?**
    *   Ensure the `parent_children` table was correctly populated. You can check this in the Admin dashboard by editing the student again and seeing if the parent email is pre-filled/linked.
    *   Ensure the student ID used in the dashboard matches the linked ID. If using a "Demo" login that relies on hardcoded IDs (like `id: 4`), ensure the database link uses that same ID.

