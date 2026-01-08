# Payment Gateway Setup Guide

## Quick Fix for Current Error ⚡

The error "We could not start this transaction - Please enter a valid Key" means you need to configure payment gateway keys.

### Two Options:

#### Option 1: Use Flutterwave (Already Partially Configured ✅)

You already have Flutterwave test key. Just make sure it's in `.env`:

```bash
VITE_FLUTTERWAVE_PUBLIC_KEY=pk_test_505887ea17908Od3799e2a453a1a004335ec86f5
```

Then restart server and **select the orange Flutterwave button** (not Paystack).

#### Option 2: Also Configure Paystack

If you want to use Paystack as well:

1. Get test key from [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developers)
2. Add to `.env`:
   ```bash
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_key_here
   ```
3. Restart server

---

## Complete `.env` Configuration

Your `.env` file should look like this:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Payment Gateways
VITE_FLUTTERWAVE_PUBLIC_KEY=pk_test_505887ea17908Od3799e2a453a1a004335ec86f5
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_key_here

# Gemini AI (if using)
VITE_GEMINI_API_KEY=your_gemini_key_here
```

---

## Test Cards

### Flutterwave Test Cards
| Card Number | CVV | Expiry | PIN | OTP |
|-------------|-----|--------|-----|-----|
| 5531 8866 5214 2950 | 564 | 09/32 | 3310 | 12345 |
| 4187 4274 1556 4246 | 828 | 09/32 | - | 12345 |

### Paystack Test Cards
| Card Number | CVV | Expiry | PIN |
|-------------|-----|--------|-----|
| 4084 0840 8408 4081 | 408 | 12/30 | 0000 |
| 5060 6666 6666 6666 | 123 | 12/30 | 1234 |

---

## Current Status

✅ Flutterwave - Key provided, needs to be in `.env`  
❌ Paystack - Not configured yet  
❌ Mobile Money - Requires additional setup

**Recommendation:** Start with Flutterwave since you already have the test key!
