# Supabase Storage Bucket Setup

To enable image uploads, you need to create a storage bucket in Supabase.

## Steps

### 1. Open Supabase Dashboard

Navigate to: [Your Supabase Project] → Storage

### 2. Create Bucket

Click "New bucket" and configure:

- **Name**: `school-logos`
- **Public bucket**: ✅ **Yes** (logos need to be publicly accessible)
- **File size limit**: 2MB
- **Allowed MIME types**: `image/*`

### 3. Set Up RLS Policies

Go to Storage → school-logos → Policies

**Create two policies:**

#### Policy 1: Upload Access (INSERT)
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload school logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-logos');
```

#### Policy 2: Public Read Access (SELECT)
```sql
-- Anyone can view school logos
CREATE POLICY "Public access to school logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-logos');
```

### 4. Test Upload

1. Sign up for a new school account
2. Click or drag an image into the logo upload area
3. Verify the image uploads and shows preview
4. Check Supabase Storage to see the uploaded file

## Bucket Structure

Files will be organized like this:

```
school-logos/
  school-slug-1/
    1738023432_abc123.png
    1738024567_def456.jpg
  school-slug-2/
    1738025678_ghi789.png
```

Each school's logos are stored in subfolders based on their slug for better organization.

## Troubleshooting

**Error: "Failed to upload"**
- Check that bucket exists and is named `school-logos`
- Verify RLS policies are active
- Ensure user is authenticated

**Error: "File too large"**
- Image must be under 2MB
- Try compressing the image

**No preview showing**
- Bucket must be marked as "Public"
- Check browser console for CORS errors
