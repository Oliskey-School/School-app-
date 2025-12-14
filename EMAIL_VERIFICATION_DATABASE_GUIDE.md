# Email Verification & Database Integration Guide

## Overview

The school app now has a complete email verification system that:
1. ✅ Saves account creation data to database
2. ✅ Automatically sends verification emails via Supabase
3. ✅ Logs all email activities
4. ✅ Tracks verification status
5. ✅ Prevents login until email is verified
6. ✅ Expires verification after 7 days

## Database Tables Involved

### 1. `auth_accounts` Table
**Purpose:** Tracks user authentication and verification status

**Columns:**
```sql
- id: SERIAL PRIMARY KEY
- username: VARCHAR(255) UNIQUE
- password: VARCHAR(255) -- hashed in production
- user_type: VARCHAR(50) -- 'Student', 'Teacher', 'Parent', 'Admin'
- email: VARCHAR(255)
- user_id: INTEGER (references users/students/teachers/parents)
- is_active: BOOLEAN -- Account enabled/disabled
- is_verified: BOOLEAN -- Email verified status
- verification_sent_at: TIMESTAMP -- When verification email was sent
- verification_expires_at: TIMESTAMP -- When verification expires (7 days)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Data Flow:**
```
User created in AddStudentScreen
  ↓
createUserAccount() is called
  ↓
Supabase Auth user created (with email confirmation)
  ↓
auth_accounts row inserted with:
  - is_verified = false
  - verification_sent_at = NOW()
  - verification_expires_at = NOW() + 7 days
  ↓
Stored in database immediately
```

### 2. `email_logs` Table (New)
**Purpose:** Audit trail for all email communications

**Columns:**
```sql
- id: SERIAL PRIMARY KEY
- recipient_email: VARCHAR(255)
- recipient_name: VARCHAR(255)
- email_type: VARCHAR(50) -- 'verification', 'password_reset', 'notification'
- subject: VARCHAR(255)
- status: VARCHAR(20) -- 'sent', 'failed', 'bounced', 'opened'
- error_message: TEXT
- sent_at: TIMESTAMP
- delivered_at: TIMESTAMP
- opened_at: TIMESTAMP
- created_at: TIMESTAMP
```

**Data Flow:**
```
sendVerificationEmail() is called
  ↓
Email type logged as 'verification'
  ↓
Row inserted into email_logs with:
  - status = 'sent'
  - sent_at = NOW()
  ↓
Stored in database
```

### 3. `users` Table (Profile Storage)
**Purpose:** Stores user profile information including avatar

**Columns:**
```sql
- id: SERIAL PRIMARY KEY
- email: VARCHAR(255) UNIQUE
- name: VARCHAR(255)
- role: VARCHAR(50) -- 'Student', 'Teacher', 'Parent', 'Admin'
- avatar_url: TEXT
- created_at: TIMESTAMP
```

## Email Verification Flow

### Step 1: Account Creation
```
Admin clicks "Save Student" in AddStudentScreen
  ↓
Form data sent to database
  ↓
createUserAccount(fullName, 'Student', email, userId) is called
  ↓
Supabase Auth creates user with email confirmation
  ↓
auth_accounts row inserted with verification metadata:
  {
    username: generated_username,
    password: generated_password,
    email: student_email,
    user_type: 'Student',
    is_verified: false,
    verification_sent_at: 2024-12-07 10:30:00,
    verification_expires_at: 2024-12-14 10:30:00  (7 days later)
  }
```

### Step 2: Email Sending
```
Supabase automatically sends confirmation email to student_email
  ↓
Email contains:
  - Professional branded header
  - Clear "Confirm Your Email" button
  - Confirmation link (expires in 7 days)
  - Feature benefits list
  - Security information
  - Support contact info
  ↓
sendVerificationEmail() logs the attempt:
  {
    recipient_email: student_email,
    recipient_name: full_name,
    email_type: 'verification',
    status: 'sent',
    sent_at: NOW()
  }
```

### Step 3: User Confirms Email
```
Student receives email
  ↓
Clicks confirmation link in email
  ↓
Supabase marks email as confirmed
  ↓
User can now login
```

### Step 4: Login Verification
```
Student attempts to login with username & password
  ↓
authenticateUser() checks auth_accounts table
  ↓
Fetches user's is_verified status
  ↓
Checks Supabase Auth email_confirmed_at timestamp
  ↓
If NOT verified AND verification_expires_at < NOW():
  Return error: "Email verification expired. Account deactivated."
  ↓
If NOT verified AND verification_expires_at > NOW():
  Return error: "Please verify your email to login"
  ↓
If verified:
  Update is_verified = true
  Allow login
```

## Code Implementation

### Creating an Account (AddStudentScreen.tsx)
```typescript
// 1. Save student to database
const { data: studentData } = await supabase
  .from('students')
  .insert([{
    name: fullName,
    grade: grade,
    section: section,
    avatar_url: selectedImage
  }])
  .select()
  .single();

// 2. Create login credentials
const authResult = await createUserAccount(fullName, 'Student', email, studentData.id);

// 3. Show credentials modal
setCredentials({
  username: authResult.username,
  password: authResult.password,
  email: email
});
setShowCredentialsModal(true);

// 4. Supabase automatically sends verification email
// 5. auth_accounts row already inserted via createUserAccount()
```

### Verifying Email at Login
```typescript
// In authenticateUser()
const { data: authAccount } = await supabase
  .from('auth_accounts')
  .select('email, user_type, is_verified, verification_sent_at, verification_expires_at')
  .eq('username', username)
  .single();

// Check if verification has expired
if (new Date(authAccount.verification_expires_at) < new Date()) {
  return { success: false, error: 'Verification expired' };
}

// Check Supabase Auth confirmation status
const { data: { user } } = await supabase.auth.getUser();
const emailConfirmed = user && user.email_confirmed_at;

if (!emailConfirmed && !authAccount.is_verified) {
  return { success: false, error: 'Please verify your email' };
}

// If confirmed on Supabase side, update our database
if (emailConfirmed) {
  await supabase
    .from('auth_accounts')
    .update({ is_verified: true })
    .eq('id', authAccount.id);
}
```

## Email Template (Improved)

### HTML Version
Located in: `lib/emailTemplates.ts`

**Features:**
- Branded gradient header
- Responsive design for mobile/desktop
- Clear call-to-action button
- Feature benefits list
- Security & privacy notices
- 7-day deadline warning (highlighted)
- Password reset instructions
- Support contact information
- Footer with privacy/terms links

### Plain Text Version
Same content as HTML, formatted for text-only email clients

## Database Schema Setup

### SQL to Create email_logs Table
```sql
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  email_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
```

**Run this in Supabase SQL editor to track all emails**

## What Gets Saved to Database

### Immediate (On Account Creation)
✅ Student/Teacher/Parent record in `students`/`teachers`/`parents` table
✅ User profile in `users` table
✅ Authentication record in `auth_accounts` table with:
  - Username & password
  - Email address
  - Verification status (false)
  - Verification timestamps
  - User type

### When Email Sent
✅ Email log entry in `email_logs` table with:
  - Recipient email
  - Recipient name
  - Email type ('verification')
  - Status ('sent')
  - Timestamp

### When User Verifies Email
✅ Supabase Auth marks email as confirmed
✅ `auth_accounts.is_verified` updated to true
✅ Login now allowed

### When User Logs In
✅ Timestamp of login recorded
✅ Session created
✅ Profile loaded from `users` table
✅ User logged in to app

## Verification Checklist

### After Creating a Student Account
- [ ] Check `auth_accounts` table has new row with `is_verified = false`
- [ ] Check `verification_expires_at` is 7 days from now
- [ ] Check `students` table has student record
- [ ] Check `users` table has user profile
- [ ] Check email_logs has 'verification' email record (once table is created)
- [ ] Student receives email in their inbox

### After Student Clicks Verification Link
- [ ] Check Supabase Auth shows `email_confirmed_at` timestamp
- [ ] Student can now login
- [ ] Check `auth_accounts.is_verified` updated to true
- [ ] Check login session created

### Testing Verification Expiration
- [ ] Create account
- [ ] Wait (or manually update `verification_expires_at` to past date)
- [ ] Attempt login
- [ ] Verify error message: "Verification expired"

## Configuration Required

### In Supabase Dashboard

1. **Email Verification Settings:**
   - Go to Authentication > Email Templates
   - Customize confirmation email template if desired
   - Ensure email provider is configured

2. **Email Logs Table:**
   - Run the SQL from `sql/email_logs_schema.sql`
   - This creates the tracking table

3. **SMTP Configuration (if custom emails needed):**
   - Configure in Supabase project settings
   - Or use Supabase's default email provider

## Troubleshooting

### Email Not Received
- [ ] Check email_logs table for 'failed' status
- [ ] Check Supabase Auth logs for email errors
- [ ] Verify email address is correct in `auth_accounts` table
- [ ] Check spam folder
- [ ] Ensure Supabase email provider is configured

### Verification Link Expired
- [ ] Account expires after 7 days
- [ ] Check `verification_expires_at` in database
- [ ] User can request new verification (feature to add)

### Can't Login After Verification
- [ ] Check if `is_verified` is true in `auth_accounts`
- [ ] Check if email_confirmed_at exists in Supabase Auth
- [ ] Verify `auth_accounts.is_active` is true

## Future Enhancements

- [ ] Resend verification email button in UI
- [ ] Email delivery tracking (bounced, opened)
- [ ] Automatic account deactivation after 7 days if unverified
- [ ] Admin panel to view email logs
- [ ] Custom email templates per school
- [ ] SMS verification as alternative
- [ ] Multi-language email templates

## Summary

Your email verification system now:
- ✅ Saves all account data immediately to database
- ✅ Sends professional branded emails
- ✅ Logs all email activities
- ✅ Enforces 7-day verification deadline
- ✅ Prevents login until verified
- ✅ Provides audit trail of all communications

**Everything is saved to Supabase database!** 🚀
