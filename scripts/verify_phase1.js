import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Manually load .env since we are running via node
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("\n🔍 ------------------------------------------");
console.log("🚀 STARTING PHASE 1 VERIFICATION SUITE");
console.log("------------------------------------------\n");

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ CRITICAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

// if (supabaseKey.startsWith('sb_publishable')) {
//    console.error(`❌ CRITICAL: Invalid Supabase Key detected: '${supabaseKey}'`);
//    console.error("    -> This looks like a Publishable Key (Clerk/Stripe format?).");
//    console.error("    -> Please replace it with your SUPABASE ANON KEY (starts with 'ey...').");
//    console.error("    -> You can find this in Supabase Dashboard > Project Settings > API.");
//    process.exit(1);
// }

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    try {
        // 1. Connection Test
        console.log("1️⃣  Step 1: Testing Database Connection...");
        const { error: connectionError } = await supabase.from('profiles').select('count').limit(1);
        if (connectionError) {
            console.error("   ❌ Connection Failed:", connectionError.message);
            console.error("      (Check if your project is paused or URL is wrong)");
            return;
        }
        console.log("   ✅ Connection Successful to Supabase.");

        // 2. Migration Check (Fees Table)
        console.log("\n2️⃣  Step 2: Verifying 'Fees' Table (Migration Check)...");
        const { error: feesError } = await supabase.from('fees').select('id').limit(1);
        if (feesError) {
            if (feesError.code === '42P01') { // PostgreSQL code for undefined_table
                console.error("   ❌ 'fees' table NOT FOUND.");
                console.error("      -> You MUST run 'sql/007_phase1_completion.sql' in Supabase SQL Editor.");
            } else {
                console.error("   ❌ Error accessing 'fees':", feesError.message);
            }
        } else {
            console.log("   ✅ 'fees' table exists and is accessible. Migration likely applied.");
        }

        // 3. Migration Check (Broadcasts)
        console.log("\n3️⃣  Step 3: Verifying 'Emergency Broadcasts' Table...");
        const { error: broadcastError } = await supabase.from('emergency_broadcasts').select('id').limit(1);
        if (broadcastError) {
            if (broadcastError.code === '42P01') {
                console.error("   ❌ 'emergency_broadcasts' table NOT FOUND.");
            } else {
                console.error("   ❌ Error accessing 'emergency_broadcasts':", broadcastError.message);
            }
        } else {
            console.log("   ✅ 'emergency_broadcasts' table exists.");
        }

        // 4. Role Check
        console.log("\n4️⃣  Step 4: Verifying 'Principal' Role Support...");
        // requires inspecting check constraint, but simple select is enough proxy for now
        console.log("   ℹ️  (Role verification requires Admin console, skipping automatic check)");

        console.log("\n------------------------------------------");
        console.log("🎉 VERIFICATION SUMMARY");
        console.log("------------------------------------------");
        console.log("If all steps above have ✅, your Phase 1 MVP is READY!");
        console.log("If you see ❌, please follow the instructions above.");

    } catch (err) {
        console.error("❌ Unexpected Verification Error:", err);
    }
}

verify();
