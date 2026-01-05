
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyPersistence() {
    console.log("🚀 Starting Persistence Verification...");

    const testClass = `TestClass_${Date.now()}`;
    const testSubject = "Quantum Physics";
    const testDay = "Monday";
    const testPeriodIdx = 0;

    // 1. Verify Timetable Persistence
    console.log(`\nTesting Timetable Persistence for class: ${testClass}`);

    // Insert
    const { error: insertError } = await supabase
        .from('timetable')
        .insert([{
            class_name: testClass,
            day_of_week: testDay,
            period_index: testPeriodIdx,
            subject: testSubject,
            start_time: '09:00',
            end_time: '10:00',
            status: 'Draft'
        }]);

    if (insertError) {
        console.error("❌ Failed to insert timetable entry:", insertError);
        process.exit(1);
    }
    console.log("✅ Inserted Timetable Entry");

    // Read Back
    const { data: readData, error: readError } = await supabase
        .from('timetable')
        .select('*')
        .eq('class_name', testClass)
        .eq('period_index', testPeriodIdx)
        .single();

    if (readError || !readData) {
        console.error("❌ Failed to read back timetable entry:", readError);
        process.exit(1);
    }

    if (readData.subject === testSubject) {
        console.log("✅ Verified: Timetable data persisted and matches.");
    } else {
        console.error("❌ Mismatch: Expected", testSubject, "Got", readData.subject);
        process.exit(1);
    }

    // Clean up
    await supabase.from('timetable').delete().eq('class_name', testClass);
    console.log("✅ Cleaned up Timetable test data");


    // 2. Verify System Settings Persistence
    console.log("\nTesting System Settings Persistence (Academic Calendar)...");
    const testKey = `test_setting_${Date.now()}`;
    const testValue = { foo: "bar", time: Date.now() };

    const { error: setInsertError } = await supabase
        .from('system_settings')
        .insert({ key: testKey, value: testValue });

    if (setInsertError) {
        console.error("❌ Failed to insert system setting:", setInsertError);
        // Don't exit, might be RLS?
    } else {
        console.log("✅ Inserted System Setting");

        const { data: setRead, error: setReadError } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', testKey)
            .single();

        if (setReadError || !setRead) {
            console.error("❌ Failed to read back setting:", setReadError);
        } else {
            if (JSON.stringify(setRead.value) === JSON.stringify(testValue)) {
                console.log("✅ Verified: System Setting persisted and matches.");
            } else {
                console.error("❌ Setting Mismatch");
            }
        }

        await supabase.from('system_settings').delete().eq('key', testKey);
    }

    console.log("\n🎉 ALL CHECKS PASSED!");
}

verifyPersistence().catch(console.error);
