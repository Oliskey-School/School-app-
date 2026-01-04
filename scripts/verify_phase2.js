#!/usr/bin/env node

/**
 * Phase 2 Verification Script
 * Verifies that Phase 2 database tables and features are properly configured
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
    console.log('🔍 PHASE 2 VERIFICATION SUITE\n');
    console.log('='.repeat(50) + '\n');

    let allPassed = true;

    // Test 1: Database Connection
    console.log('1️⃣  Testing Database Connection...');
    try {
        const { data, error } = await supabase.from('students').select('id').limit(1);
        if (error) throw error;
        console.log('   ✅ Database connection successful\n');
    } catch (error) {
        console.log(`   ❌ Database connection failed: ${error.message}\n`);
        allPassed = false;
    }

    // Test 2: Resources Table
    console.log('2️⃣  Testing \'resources\' Table...');
    try {
        const { data, error } = await supabase
            .from('resources')
            .select('id, title, type, subject')
            .limit(1);

        if (error) throw error;
        console.log(`   ✅ 'resources' table exists and accessible`);
        console.log(`   📊 Current resources count: ${data?.length || 0}\n`);
    } catch (error) {
        console.log(`   ❌ 'resources' table error: ${error.message}`);
        console.log('   ⚠️  Apply database/phase2_minimal.sql in Supabase SQL Editor\n');
        allPassed = false;
    }

    // Test 3: Quizzes Table
    console.log('3️⃣  Testing \'quizzes\' Table...');
    try {
        const { data, error } = await supabase
            .from('quizzes')
            .select('id, title, subject, is_published')
            .limit(1);

        if (error) throw error;
        console.log(`   ✅ 'quizzes' table exists and accessible`);
        console.log(`   📊 Current quizzes count: ${data?.length || 0}\n`);
    } catch (error) {
        console.log(`   ❌ 'quizzes' table error: ${error.message}`);
        console.log('   ⚠️  Apply database/phase2_minimal.sql in Supabase SQL Editor\n');
        allPassed = false;
    }

    // Test 4: Questions Table
    console.log('4️⃣  Testing \'questions\' Table...');
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('id, quiz_id, type')
            .limit(1);

        if (error) throw error;
        console.log(`   ✅ 'questions' table exists and accessible\n`);
    } catch (error) {
        console.log(`   ❌ '

questions' table error: ${error.message}\n`);
        allPassed = false;
    }

    // Test 5: Quiz Submissions Table
    console.log('5️⃣  Testing \'quiz_submissions\' Table...');
    try {
        const { data, error } = await supabase
            .from('quiz_submissions')
            .select('id, quiz_id, student_id, status')
            .limit(1);

        if (error) throw error;
        console.log(`   ✅ 'quiz_submissions' table exists and accessible`);
        console.log(`   📊 Current submissions count: ${data?.length || 0}\n`);
    } catch (error) {
        console.log(`   ❌ 'quiz_submissions' table error: ${error.message}\n`);
        allPassed = false;
    }

    // Final Summary
    console.log('='.repeat(50) + '\n');

    if (allPassed) {
        console.log('🎉 Phase 2 Database is READY!\n');
        console.log('Next steps:');
        console.log('1. Configure Supabase Storage bucket: "resources"');
        console.log('2. Test quiz creation in teacher dashboard');
        console.log('3. Test resource upload in admin panel\n');
        return 0;
    } else {
        console.log('❌ Phase 2 verification FAILED\n');
        console.log('Required actions:');
        console.log('1. Open Supabase Dashboard → SQL Editor');
        console.log('2. Copy/paste database/phase2_minimal.sql');
        console.log('3. Click Run\n');
        return 1;
    }
}

// Run verification
runVerification()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
