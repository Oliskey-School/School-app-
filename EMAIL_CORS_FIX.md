-- ============================================
-- EMAIL SENDING FIX GUIDE
-- ============================================

PROBLEM:
The Resend API cannot be called from the browser due to CORS restrictions.
Your console shows: "Access to fetch at 'https://api.resend.com/emails' has been blocked by CORS policy"

SOLUTION OPTIONS:

Option 1: Use Supabase Edge Functions (Recommended)
-------------------------------------------------------
1. Go to Supabase Dashboard → Edge Functions
2. Create a new function called "send-welcome-email"
3. Deploy the function code (see EDGE_FUNCTION.md)
4. Update your app to call this function instead of Resend directly

Option 2: Simple Fix - Disable Email Temporarily
-------------------------------------------------------
For now, accounts are created successfully even without emails.
Users can still log in with the credentials shown on screen.

To disable email temporarily:
1. The account creation still works
2. Users see their credentials on screen
3. They can log in immediately

Option 3: Add a Simple Backend Server
-------------------------------------------------------
Create a small Express.js server to handle email sending.
(See BACKEND_SERVER_GUIDE.md for full setup)

============================================
RECOMMENDED: Option 2 for Now
============================================

Your app is working! Emails will be fixed later with Edge Functions.
For development, you can:
1. ✅ Create accounts (working)
2. ✅ Login with credentials shown on screen (working)
3. ❌ Email sending (needs backend - coming soon)

The credentials modal shows all login info, so users don't need the email right now.
