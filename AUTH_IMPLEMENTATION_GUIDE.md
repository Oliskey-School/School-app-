# User Authentication Implementation Guide

## Overview
This guide explains how the new user authentication system works for the school app. When an admin creates a student, teacher, or parent account, the system automatically generates login credentials and saves them to the Supabase database.

## How It Works

### 1. Automatic Credential Generation
When an admin creates a new user (Student, Teacher, or Parent):

- **Username**: Automatically generated from the user's name
  - Format: `[userType][FirstName].[LastName]` in lowercase
  - Example: For "Adebayo Adewale" as a student → `sadebayo.adewale`
  
- **Password**: Automatically generated from the surname + "1234"
  - Example: For surname "Adewale" → `adewale1234`

### 2. Database Storage
The credentials are stored in the `auth_accounts` table in Supabase with the following fields:
- `username`: Unique username for login
- `password`: Password (currently stored as plain text - **should be hashed in production**)
- `user_type`: Type of user (Student, Teacher, Parent, Admin)
- `email`: User's email address
- `user_id`: Reference to the user in the `users` table
- `is_active`: Boolean flag to enable/disable accounts

### 3. Login Process
When a user attempts to login:
1. The system first tries to authenticate against the `auth_accounts` table in Supabase
2. If Supabase is not connected, it falls back to demo credentials
3. Upon successful authentication, the user is directed to their respective dashboard

## Setup Instructions

### Step 1: Execute the Migration
Run the SQL migration to create the `auth_accounts` table:

```sql
-- Run this in your Supabase SQL Editor
-- File: sql/auth_accounts_schema.sql
```

Or copy and paste the contents of `sql/auth_accounts_schema.sql` into Supabase SQL Editor and execute.

### Step 2: Test the System

#### Create a Student Account:
1. Go to Admin Dashboard → Add Student
2. Fill in student details (name, grade, section, etc.)
3. Click "Save Student"
4. You'll see an alert with the generated credentials:
   ```
   Student created successfully!
   
   Login Details:
   Username: [generated_username]
   Password: [generated_password]
   ```

#### Login with Generated Credentials:
1. Go to the Login page
2. Enter the username and password from the alert
3. You'll be directed to the Student Dashboard

## Implementation Details

### Files Modified

#### 1. **lib/auth.ts** (New File)
Contains authentication utility functions:
- `generateUsername(fullName, userType)`: Generates username
- `generatePassword(surname)`: Generates password
- `createUserAccount()`: Creates auth account in database
- `authenticateUser()`: Authenticates user during login
- `checkUsernameExists()`: Checks if username is already taken

#### 2. **components/auth/Login.tsx** (Modified)
Updated to:
- Import authentication functions
- Check database for credentials first
- Fall back to demo credentials if database fails
- Show loading state during login attempt

#### 3. **components/admin/AddStudentScreen.tsx** (Modified)
Updated to:
- Import auth functions
- Call `createUserAccount()` after creating student
- Display generated credentials in alert

#### 4. **components/admin/AddTeacherScreen.tsx** (Modified)
Updated to:
- Import auth functions
- Call `createUserAccount()` after creating teacher
- Display generated credentials in alert

#### 5. **components/admin/AddParentScreen.tsx** (Modified)
Updated to:
- Import auth functions
- Call `createUserAccount()` after creating parent
- Display generated credentials in alert

### Database Schema

```sql
CREATE TABLE auth_accounts (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  user_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

## Example Credentials

### Student Creation:
- **Name**: John Adebayo
- **Generated Username**: `sjohn.adebayo`
- **Generated Password**: `adebayo1234`

### Teacher Creation:
- **Name**: Mrs. Funke Akintola
- **Generated Username**: `tfunke.akintola`
- **Generated Password**: `akintola1234`

### Parent Creation:
- **Name**: Mr. Adewale Johnson
- **Generated Username**: `padewale.johnson`
- **Generated Password**: `johnson1234`

## Security Considerations ⚠️

**Current Implementation**: Passwords are stored as plain text
**Production Recommendation**: 

1. **Hash Passwords**: Use bcrypt or similar to hash passwords before storing
   ```typescript
   import bcrypt from 'bcrypt';
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **Use Supabase Auth**: Consider using Supabase's built-in authentication system for better security

3. **SSL/TLS**: Ensure all communications are encrypted

4. **Rate Limiting**: Implement rate limiting on login attempts

## Demo Credentials (Fallback)

If Supabase is not connected, the following demo credentials work:
- **Admin**: Username: `admin`, Password: `admin`
- **Teacher**: Username: `teacher`, Password: `teacher`
- **Parent**: Username: `parent`, Password: `parent`
- **Student**: Username: `student`, Password: `student`

## Troubleshooting

### Issue: "Invalid credentials"
**Solution**: 
- Check that the username is exactly as shown in the creation alert
- Ensure the password matches the generated password (surname + 1234)
- Verify the account is active in the database

### Issue: Created account but can't login
**Solution**:
- Verify that the `auth_accounts` table exists in Supabase
- Check that RLS policies are correctly set up
- Look at browser console for error messages

### Issue: Generated credentials not showing
**Solution**:
- Check browser console for error messages
- Verify Supabase connection status
- Ensure the `auth_accounts` table was created

## Future Enhancements

1. ✅ Add password hashing with bcrypt
2. ✅ Implement email verification
3. ✅ Add password reset functionality
4. ✅ Implement multi-factor authentication (MFA)
5. ✅ Add login attempt logging for security audit
6. ✅ Implement session management
7. ✅ Add password strength validation
8. ✅ Support OAuth integration (Google, Microsoft, etc.)
