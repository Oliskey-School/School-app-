# 📧 Email Service Setup Guide

## Overview
Your app now has a professional email service that sends **Welcome Emails** to newly created users with their login credentials!

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get a Free Resend API Key

1. Go to **[https://resend.com](https://resend.com)**
2. Click **"Sign Up"** (it's free!)
3. Verify your email
4. Go to **API Keys** → **Create API Key**
5. Copy your API key (starts with `re_...`)

### Step 2: Add API Key to Your Project

1. Open your `.env` file in the project root
2. Add this line:
   ```
   VITE_RESEND_API_KEY=re_your_actual_api_key_here
   ```
3. (Optional) Customize the sender email:
   ```
   VITE_FROM_EMAIL=onboarding@resend.dev
   ```

### Step 3: Restart Your Dev Server

```bash
# Press Ctrl+C to stop the current server
# Then restart it:
npm run dev
```

### Step 4: Test It!

1. Go to **Admin Dashboard** → **User Accounts** → **Add Parent**
2. Fill in the form with a **real email address** (your Gmail)
3. Click **Save Parent**
4. **Check your Gmail inbox!** 📬

---

## 📧 What Emails Look Like

The welcome email includes:
- ✅ Professional header with school branding
- ✅ Login credentials (username & password)
- ✅ Direct login button
- ✅ Security warning to change password
- ✅ Next steps guidance

---

## 🎯 Free Tier Limits

**Resend Free Plan:**
- 100 emails per day
- 3,000 emails per month
- Perfect for development and small schools!

---

## 🔧 Troubleshooting

### Email Not Received?

1. **Check Spam Folder** - First-time emails might go there
2. **Verify API Key** - Make sure it starts with `re_`
3. **Check Console** - Look for `✅ Welcome email sent to:` message
4. **Try Different Email** - Some providers block automated emails

### "API key not configured" Warning?

- Make sure your `.env` file has `VITE_RESEND_API_KEY`
- Restart your dev server after adding the key
- Don't use quotes around the API key value

### Still Not Working?

Check the browser console (F12) for error messages. The email sending is logged there.

---

## 🎨 Customization

Want to customize the email design?

Edit `lib/emailService.ts` and modify the `emailHtml` template!

---

## 📝 Next Steps

1. ✅ Set up your Resend account
2. ✅ Add API key to `.env`
3. ✅ Test with your email
4. ✅ (Optional) Add your own domain for professional sender address

---

**That's it! Your school app now sends professional welcome emails! 🎉**
