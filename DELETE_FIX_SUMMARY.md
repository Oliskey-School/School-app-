
# Deep Delete: Cleaning up "Zombie" Accounts

## The Problem
When you deleted a student in the Admin Dashboard, the system deleted their **Student Profile** but left behind their **User Account** (login credentials). This is why they still appeared in the User Accounts list and Authentication logs.

## The Fix
1.  **Immediate Cleanup**: 
    *   I ran a cleanup script to forcefully remove `olamide.oluwapelumi.@student.school.com` from **all** database tables and the Authentication system. That account is gone.

2.  **Permanent Fix for Future Deletes**:
    *   I updated the "Delete Student" button logic to attempt to delete the User Account and Auth Data as well.
    *   **CRITICAL STEP**: For this to work fully for *future* deletes, the database needs a special permission function.

## Action Required: database Setup
To allow the Admin Dashboard to delete Authentication users automatically, you must run a small SQL script in your Supabase Dashboard.

### Instructions
1.  Go to your **Supabase Dashboard**.
2.  Click on the **SQL Editor** (terminal icon on the left).
3.  Click **"New Query"**.
4.  Copy and paste the code below:

```sql
-- Function to delete a user from Supabase Auth by email
CREATE OR REPLACE FUNCTION delete_auth_user_by_email(email_input TEXT)
RETURNS VOID AS $$
BEGIN
  -- Delete from auth.users. This usually cascades to other auth tables.
  DELETE FROM auth.users WHERE email = email_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant functionality to authenticated users
GRANT EXECUTE ON FUNCTION delete_auth_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_auth_user_by_email(TEXT) TO service_role;
```

5.  Click **Run**.

Once this is done, the "Delete" button in your app will cleanly remove the Student, the User Account, and the Login Credential in one go.
