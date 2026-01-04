# Supabase Storage Setup Guide

## Creating the Resources Bucket

After you've applied the Phase 2 database schema, you need to create a storage bucket for file uploads.

### Step 1: Access Supabase Storage

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "Storage" in the left sidebar

### Step 2: Create Bucket

1. Click "Create a new bucket"
2. Enter bucket name: `resources`
3. **Public bucket:** ✅ Yes (check this box)
   - This allows students/parents to view resources without authentication
4. Click "Create bucket"

### Step 3: Configure Bucket Policies

The bucket should have these policies (automatically created for public buckets):

#### SELECT Policy (View files)
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'resources' );
```

#### INSERT Policy (Upload files)
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resources' 
  AND auth.role() = 'authenticated'
);
```

#### UPDATE Policy (Update files)
```sql
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'resources' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'resources' );
```

#### DELETE Policy (Delete files)
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'resources' AND auth.uid() = owner );
```

### Step 4: Set File Size Limits (Optional)

In Supabase Dashboard → Storage → Settings:
- **Maximum file size:** 50 MB (adjust as needed)
- **Allowed MIME types:** 
  - `application/pdf`
  - `video/mp4`
  - `video/webm`
  - `audio/mpeg`
  - `application/vnd.ms-powerpoint`
  - `application/vnd.openxmlformats-officedocument.presentationml.presentation`

---

## Verify Storage is Working

After creating the bucket, test the upload functionality:

### Test 1: Admin Resource Upload

1. Login to your app as an admin
2. Navigate to "Manage Learning Resources"
3. Click "Upload Resource"
4. Select a PDF file (< 10MB recommended for testing)
5. Fill in metadata:
   - Title: "Test Resource"
   - Subject: "Mathematics"
   - Type: "PDF"
   - Grade: 10
6. Click "Upload"

**Expected Result:**
- File uploads successfully
- Progress bar shows 100%
- Resource appears in the list
- File is viewable by students/parents

### Test 2: View Resource as Student/Parent

1. Login as student or parent
2. Navigate to "Learning Resources"
3. Find the test resource
4. Click to view/download

**Expected Result:**
- File downloads or opens in new tab
- PDF displays correctly

---

## Troubleshooting

### Error: "Bucket does not exist"
**Solution:** Make sure you created the bucket named exactly `resources` (lowercase, no spaces)

### Error: "Permission denied"
**Solution:** Check that the bucket is marked as **public** and policies are configured

### Files won't upload
**Possible causes:**
1. File size exceeds limit
2. File type not allowed
3. User not authenticated
4. Bucket policies not configured

**Check:**
```javascript
// In browser console after upload attempt
console.log('Upload error:', error);
```

### Files upload but can't be viewed
**Solution:** Ensure bucket is marked as **Public** in settings

---

## Advanced Configuration (Optional)

### Enable CDN
In Storage settings, enable CDN for faster file delivery globally.

### Custom Domain
Configure a custom domain for your storage bucket:
1. Storage → Settings → Custom domains
2. Add your domain
3. Update DNS records as instructed

### File Transformations
For images/videos, enable automatic transformations:
- Thumbnail generation
- Format conversion
- Compression

---

## Security Best Practices

1. **Virus Scanning:** Consider integrating with a virus scanning service for uploaded files
2. **File Validation:** Always validate file types and sizes on both client and server
3. **Rate Limiting:** Implement upload rate limits to prevent abuse
4. **Audit Logging:** Log all upload/delete operations for accountability

---

## Next Steps

After storage is configured:

1. ✅ Apply Phase 2 database schema
2. ✅ Create storage bucket
3. Test resource upload end-to-end
4. Test quiz creation and submission
5. Update documentation with any specific setup notes

---

## Quick Reference

**Bucket Name:** `resources`  
**Access:** Public  
**Max Size:** 50 MB  
**Allowed Types:** PDF, Video (MP4/WebM), Audio (MP3/WAV), Slides (PPT/PPTX)

**Helper Functions:** See `lib/storage.ts` for upload/download/delete utilities
