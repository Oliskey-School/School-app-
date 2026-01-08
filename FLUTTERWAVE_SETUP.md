# Flutterwave Payment Configuration Guide

## Quick Setup

### 1. Get Your Flutterwave API Keys

1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Sign up or log in
3. Navigate to **Settings** → **API Keys**
4. Copy your **Public Key** (starts with `FLWPUBK-`)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X
```

**For Testing:**
- Use **Test Mode** keys from Flutterwave dashboard
- Test cards: https://developer.flutterwave.com/docs/integration-guides/testing-helpers/

**For Production:**
- Use **Live Mode** keys
- Ensure your business is verified

### 3. Restart Development Server

```bash
npm run dev
```

---

## Current Issue

The error "Invalid parameter ('PBFPubKey')" means:
- ❌ No valid Flutterwave public key configured
- ✅ **Solution**: Add `VITE_FLUTTERWAVE_PUBLIC_KEY` to `.env` file

---

## Test Cards (Test Mode Only)

| Card Number | CVV | Expiry | PIN | OTP |
|-------------|-----|--------|-----|-----|
| 5531 8866 5214 2950 | 564 | 09/32 | 3310 | 12345 |
| 4187 4274 1556 4246 | 828 | 09/32 | - | 12345 |

---

## Troubleshooting

**Problem**: "Payment gateway not configured"
- **Fix**: Add valid `VITE_FLUTTERWAVE_PUBLIC_KEY` to `.env`

**Problem**: Payment modal doesn't open
- **Fix**: Check browser console for errors
- **Fix**: Ensure Flutterwave script is loaded (check Network tab)

**Problem**: Payment fails immediately
- **Fix**: Verify public key format (should start with `FLWPUBK-`)
- **Fix**: Check you're using Test keys in development
