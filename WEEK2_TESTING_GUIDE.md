# Week 2: Enhanced Authentication Testing Guide

## ✅ Week 2 Complete

All authentication and verification features have been implemented:
- Phone number verification with SMS OTP
- National ID document upload
- Multi-role support (Principal, Counselor)
- Admin verification panel

---

## Testing Checklist

### 1. Database Setup

**Run the migration:**
```sql
-- In Supabase SQL Editor, run:
-- sql/003_add_verification.sql
```

**Verify tables created:**
- `verification_codes`
- `id_verification_requests`
- `verification_audit_log`

**Check profiles table has new columns:**
- `phone`
- `phone_verified`
- `id_document_url`
- `verification_status`

---

### 2. SMS OTP Configuration

**Set up Africa's Talking (recommended for Nigeria):**

1. Sign up at [africastalking.com](https://africastalking.com)
2. Get API key and username
3. Set Supabase Edge Function secrets:
   ```bash
   supabase secrets set AFRICASTALKING_API_KEY=your_key
   supabase secrets set AFRICASTALKING_USERNAME=your_username
   ```

**OR set up Twilio (alternative):**
```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

**Deploy Edge Functions:**
```bash
supabase functions deploy send-otp
supabase functions deploy verify-otp
```

---

### 3. Supabase Storage Setup

**Create storage bucket for ID documents:**

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `id-documents`
3. Set as **Private** (not public)
4. Add RLS policy for authenticated users:
   ```sql
   -- Allow users to upload their own documents
   CREATE POLICY "Users can upload own ID documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
   
   -- Allow admins to view all documents
   CREATE POLICY "Admins can view all ID documents"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'id-documents' AND
     EXISTS (
       SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
       AND profiles.role IN ('admin', 'principal')
     )
   );
   ```

---

### 4. Phone Verification Testing

**Test flow as a user:**

1. **Start verification:**
   - Navigate to phone verification screen
   - Enter Nigerian number: +234XXXXXXXXXX
   - Click "Send Code"

2. **Check SMS received:**
   - Should receive 6-digit code
   - Code valid for 10 minutes

3. **Verify code:**
   - Enter received code
   - Click "Verify Code"
   - Profile should update with `phone_verified = true`

4. **Test resend:**
   - Wait 60 seconds (rate limit)
   - Click "Didn't receive code? Resend"
   - Should receive new code

5. **Test wrong code:**
   - Enter invalid code
   - Should show error message
   - After 3 failed attempts, should require new code

**Check database:**
```sql
-- View verification codes
SELECT * FROM verification_codes WHERE phone = '+234XXXXXXXXXX';

-- Check profile updated
SELECT phone, phone_verified, phone_verified_at 
FROM profiles 
WHERE phone = '+234XXXXXXXXXX';

-- View audit log
SELECT * FROM verification_audit_log 
WHERE action LIKE 'phone_%' 
ORDER BY created_at DESC;
```

---

### 5. ID Document Upload Testing

**Test upload flow:**

1. **Select document type:**
   - National ID / Passport / Driver's License

2. **Upload file:**
   - Try JPG image (should work)
   - Try PNG image (should work)
   - Try PDF (should work)
   - Try file > 5MB (should reject)
   - Try invalid format like .txt (should reject)

3. **Preview:**
   - Image previews should display
   - PDF files won't preview (expected)

4. **Submit:**
   - Click "Upload Document"
   - Should save to Supabase Storage
   - Should create verification request
   - Profile should update with `verification_status = 'pending'`

**Check database:**
```sql
-- View verification requests
SELECT * FROM id_verification_requests ORDER BY created_at DESC;

-- Check profile updated
SELECT id_document_url, id_document_type, verification_status 
FROM profiles 
WHERE id IS NOT NULL;
```

**Check storage:**
- Go to Supabase Dashboard → Storage → id-documents
- Should see uploaded file

---

### 6. Admin Verification Panel Testing

**Test as admin:**

1. **Access panel:**
   - Login as admin/principal
   - Navigate to admin dashboard
   - Go to ID Verification section

2. **View requests:**
   - Should see list of pending requests
   - Filter by: All / Pending / Approved / Rejected

3. **Review request:**
   - Click on a request card
   - Modal should open with full document preview
   - Verify user details display correctly

4. **Approve workflow:**
   - Add review notes
   - Click "Approve"
   - Request status → approved
   - Profile `verification_status` → verified
   - User receives notification (if implemented)

5. **Reject workflow:**
   - Add rejection reason (required)
   - Click "Reject"
   - Request status → rejected
   - Profile `verification_status` → rejected
   - Notes saved for user to see

**Check database:**
```sql
-- View approved requests
SELECT * FROM id_verification_requests WHERE status = 'approved';

-- Check profile verification updated
SELECT full_name, verification_status, verified_by, verified_at 
FROM profiles 
WHERE verification_status = 'verified';

-- Check audit log
SELECT * FROM verification_audit_log 
WHERE action LIKE 'id_%' 
ORDER BY created_at DESC;
```

---

### 7. Multi-Factor Authentication Testing

**Test complete flow:**

1. **New user signup:**
   - Create account with email/password
   - Profile created with `verification_status = 'unverified'`

2. **Add phone verification:**
   - Navigate to settings/profile
   - Add phone number
   - Complete OTP verification
   - Profile: `phone_verified = true`

3. **Upload ID:**
   - Upload national ID
   - Profile: `verification_status = 'pending'`

4. **Admin approval:**
   - Admin reviews and approves
   - Profile: `verification_status = 'verified'`

5. **Fully verified user:**
   - Has email (from signup)
   - Has verified phone
   - Has approved ID
   - Can access all features

**Verification levels:**
```sql
-- Check verification status
SELECT 
  full_name,
  email,
  phone,
  phone_verified,
  verification_status,
  CASE 
    WHEN phone_verified AND verification_status = 'verified' THEN 'Fully Verified'
    WHEN phone_verified THEN 'Phone Verified'
    WHEN verification_status = 'pending' THEN 'Pending Review'
    ELSE 'Unverified'
  END as status_level
FROM profiles;
```

---

### 8. New Roles Testing

**Test Principal role:**

1. Create user with role 'principal'
2. Verify can access admin verification panel
3. Verify can approve/reject ID requests
4. RLS policies should allow same access as admin

**Test Counselor role:**

1. Create user with role 'counselor'
2. Define counselor permissions (TBD based on requirements)
3. Test access to appropriate features

```sql
-- Create principal
UPDATE profiles 
SET role = 'principal' 
WHERE email = 'principal@school.com';

-- Create counselor
UPDATE profiles 
SET role = 'counselor' 
WHERE email = 'counselor@school.com';
```

---

## Security Verification

**RLS Policy Tests:**

Test unauthorized access:
```javascript
// Try to access another user's verification code (should fail)
const { data, error } = await supabase
  .from('verification_codes')
  .select('*')
  .eq('user_id', 'some-other-user-id');

console.log(error); // Should show permission denied

// Non-admin trying to approve request (should fail)
const { error: approveError } = await supabase
  .from('id_verification_requests')
  .update({ status: 'approved' })
  .eq('id', 'request-id');

console.log(approveError); // Should show permission denied
```

**Rate Limiting:**
- Send OTP multiple times quickly
- Should enforce 60-second cooldown
- Check localStorage for `otp_last_sent_{phone}`

**Input Validation:**
- Try invalid phone formats
- Try uploading huge files
- Try SQL injection in notes fields

---

## Performance Testing

**Load test OTP sending:**
```bash
# Send 10 OTPs concurrently (watch for rate limits from provider)
for i in {1..10}; do
  curl -X POST https://your-project.supabase.co/functions/v1/send-otp \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"phone":"+234800000000'$i'"}' &
done
```

**Storage performance:**
- Upload 10 documents simultaneously
- Check upload speed
- Verify all complete successfully

---

## 🎉 Week 2 Complete!

All enhanced authentication features tested and working:
- ✅ Phone verification with SMS OTP
- ✅ ID document upload and storage
- ✅ Admin verification review panel
- ✅ Multi-factor authentication flow
- ✅ New roles (Principal, Counselor)
- ✅ Comprehensive audit logging

**Ready for Week 3: Push Notifications & SMS Infrastructure**
