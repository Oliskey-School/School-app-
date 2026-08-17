#!/usr/bin/env node
// Runs before `vite build` (see package.json's prebuild/prebuild:vps).
// Frontend env vars get baked into the built JS bundle at build time — a
// placeholder value here doesn't fail loudly like a missing backend secret
// does (backend/src/config/env.ts already process.exit(1)s on that); it just
// silently ships a fake key to every visitor's browser. This catches the
// specific failure mode Step 17 describes: someone copies .env.example to
// .env and forgets to replace a placeholder before building for production.
//
// Most VITE_ vars are legitimately optional (the app degrades gracefully —
// see lib/config.ts, lib/ai.ts) so this does NOT require every var to be
// set. It only fails when a var IS set but still looks like a placeholder.

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const envFiles = ['.env.production.local', '.env.production', '.env.local', '.env'];

const vars = {};
for (const file of envFiles) {
    const p = resolve(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const [, key, rawValue] = m;
        if (!(key in vars)) vars[key] = rawValue.replace(/^["']|["']$/g, '');
    }
}
const PLACEHOLDER_PATTERNS = [
    /^your[-_]/i,
    /^YOUR_/,
    /_xxx$/i,
    /^xxx/i,
    /\.supabase\.co/i,
    /replace-with/i,
    /change[-_]?me/i,
    /^sk_test_xxx$|^pk_test_xxx$|^FLWPUBK_TEST-xxx$|^FLWSECK_TEST-xxx$/i,
];

const isPlaceholder = (value) => PLACEHOLDER_PATTERNS.some((re) => re.test(value));

// Only vars that are actually consumed by the app (see .env.example) are
// worth checking — an unrelated env var with a "your-" prefix isn't ours to
// judge.
const CHECKED_VARS = [
    'VITE_API_URL', 'VITE_SOCKET_URL', 'VITE_GOOGLE_CLIENT_ID',
    'VITE_GEMINI_API_KEY', 'VITE_PAYSTACK_PUBLIC_KEY', 'VITE_FLUTTERWAVE_PUBLIC_KEY',
    'VITE_FIREBASE_VAPID_KEY', 'VITE_SENTRY_DSN', 'VITE_RESEND_API_KEY',
];

const failures = [];
for (const key of CHECKED_VARS) {
    // Shell-provided env vars (e.g. CI secrets) take priority over file values.
    const value = process.env[key] !== undefined ? process.env[key] : vars[key];
    if (value && isPlaceholder(value)) {
        failures.push(`  ${key}=${value}`);
    }
}

if (failures.length > 0) {
    console.error('\n❌ Build blocked: placeholder values found in frontend env vars.\n');
    console.error('These look like copy-pasted example values, not real ones — building');
    console.error('with them ships a fake key to every visitor\'s browser:\n');
    console.error(failures.join('\n'));
    console.error('\nFix the real value in your .env file (see .env.example for what each');
    console.error('one is for), or leave the var unset entirely if the feature is optional.\n');
    process.exit(1);
}

console.log('✅ [check-env] No placeholder values found in frontend env vars.');
