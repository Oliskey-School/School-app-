# Supabase Email Verification Configuration

## Required Settings

Navigate to your Supabase Dashboard to configure the following settings:

### Authentication → URL Configuration

**Location**: [Your Supabase Project] → Authentication → URL Configuration

#### 1. Site URL

Set this to your application's root URL:

**Development**:
```
http://localhost:3000
```

**Production**:
```
https://yourdomain.com
```

#### 2. Redirect URLs

Add these URLs to the whitelist (one per line):

**Development**:
```
http://localhost:3000
http://localhost:3000/**
http://localhost:3000/#*
```

**Production**:
```
https://yourdomain.com
https://yourdomain.com/**
https://yourdomain.com/#*
```

> **Why the wildcards?**  
> Because this app uses hash-based routing (#), Supabase needs permission to redirect to any hash route. The `**` pattern allows all paths, and `#*` allows all hash fragments.

---

## How It Works

### Email Confirmation Flow

1. **User Signs Up**
   - User completes signup form
   - Supabase sends confirmation email

2. **User Clicks Email Link**
   - Link format: `http://localhost:3000/#access_token=xxx&refresh_token=yyy&type=signup`
   - Browser loads app with hash params

3. **App Detects Confirmation**
   - `App.tsx` detects `access_token` in hash
   - Shows `AuthConfirm` component

4. **Token Exchange**
   - `AuthConfirm` calls `supabase.auth.setSession()`
   - Session is created automatically
   - `email_confirmed_at` is set

5. **Redirect to Dashboard**
   - Hash is cleared
   - Page reloads
   - User sees dashboard with welcome toast

---

## Testing the Flow

### 1. Enable Email Confirmations

**Location**: Authentication → Providers → Email

- ✅ Enable "Confirm email"
- Set "Confirm email" to **Required**

### 2. Test Locally

```bash
# Start your dev server
npm run dev

# Sign up with a real email address
# Check your inbox for confirmation email
# Click the link
# Should redirect to http://localhost:3000/#access_token=...
# Should auto-verify and show dashboard
```

### 3. Check Logs

Watch the browser console for:
```
🔐 Auth Event: SIGNED_IN
✅ Auth state updated: { email_confirmed_at: "2026-01-27..." }
📧 VerificationGuard: Email verified, granting access
```

---

## Common Issues

### Issue: "Invalid Redirect URL"

**Cause**: Your redirect URL isn't whitelisted in Supabase.

**Fix**: Add `http://localhost:3000/#*` to Redirect URLs.

### Issue: Infinite Redirect Loop

**Cause**: Hash not being cleared after verification.

**Fix**: Ensure `AuthConfirm.tsx` clears the hash:
```tsx
window.location.hash = '';
window.location.reload();
```

### Issue: Email Not Sending

**Cause**: Email provider not configured or rate limited.

**Fix**:
1. Check Supabase logs for email errors
2. Verify SMTP settings (if using custom SMTP)
3. Check spam folder

### Issue: Token Expired

**Cause**: User clicked old confirmation link.

**Solution**: Show "Resend Email" button (already implemented).

---

## Production Recommendations

### 1. Custom Email Domain

Set up a custom email domain to avoid spam filters:

**Location**: Project Settings → Email

- Use your own domain (e.g., `noreply@yourschool.com`)
- Configure SPF, DKIM, DMARC records

### 2. Custom Email Template

**Location**: Authentication → Email Templates → Confirm Signup

Customize the message to match your branding:

```html
<h2>Welcome to [School Name]!</h2>
<p>Click below to verify your email and access your dashboard:</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email Address</a></p>
<p>This link expires in 24 hours.</p>
```

### 3. Rate Limiting

Enable rate limiting to prevent abuse:

**Location**: Authentication → Rate Limits

- Email sends: 4 per hour per email
- Failed attempts: 5 per hour per IP

---

## Security Notes

✅ **Session Security**
- Tokens are single-use only
- Expired tokens return errors (no silent bypass)
- Sessions are created server-side by Supabase

✅ **Dashboard Protection**
- `VerificationGuard` blocks unverified users
- RLS policies enforce data isolation
- No client-side bypass possible

✅ **Token Handling**
- Tokens never stored in localStorage
- Hash is cleared immediately after use
- No token leakage in browser history

---

## Deployment Checklist

Before deploying to production:

- [ ] Update Site URL to production domain
- [ ] Add production redirect URLs
- [ ] Test email sending from production
- [ ] Verify SSL certificate is valid
- [ ] Check spam folder delivery
- [ ] Test verification flow end-to-end
- [ ] Monitor Supabase logs for errors

---

## Support

If you encounter issues:

1. Check Supabase Dashboard → Logs → Auth Logs
2. Check browser console for errors
3. Verify all URLs are whitelisted
4. Test with a fresh incognito window

For Supabase-specific issues, refer to:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Email Configuration](https://supabase.com/docs/guides/auth/auth-email)
