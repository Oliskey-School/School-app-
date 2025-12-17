
# Parent Profile Update Fix Summary

## Issue
The user encountered a "Failed to update profile" error when trying to save changes in the Parent Dashboard.
The error was caused by the system attempting to update a `phone` column in the `users` table, which does not exist in the database schema. The `users` table stores authentication data (email, name, role), while the `parents` table stores role-specific data (phone, child links).

## Fix Implemented
1.  **Corrected `ProfileContext.tsx`**:
    *   Removed `phone` from the SQL `select` and `update` queries targeting the `users` table.
    *   This ensures that profile updates (Name, Email, Avatar) succeed without triggering a "Column does not exist" database error.
    *   Phone numbers continue to be correctly handled by the `EditParentProfileScreen` which updates the `parents` table directly.

2.  **Improved Error Reporting**:
    *   Updated `EditParentProfileScreen.tsx` to display the specific error message from the database in the alert box, should any future errors occur (e.g., "New row violates RLS policy").

## Verification
1.  **Login**: Log in as the Parent (`oliskeylee@gmail.com`).
2.  **Edit Profile**: Go to **More Options** -> **Edit Profile**.
3.  **Change Data**: Update the phone number or name and click **Save**.
4.  **Success**: The "Profile saved successfully!" message should appear, and the error should be gone.

## Note on Phone Numbers
*   Phone numbers are stored in the `parents` table. The fix ensures that updating the phone number persists correctly in that table without causing collateral damage in the auth system.
