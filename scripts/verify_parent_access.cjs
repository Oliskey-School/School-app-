const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyParentAccess() {
    console.log("Verifying Parent Access with Anon Key (Simulating Mock Login)...");

    // 1. Fetch any parent profile to simulate login
    console.log(`\n1. Fetching a parent profile...`);
    const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id, name, email')
        .limit(1)
        .single();

    if (parentError) {
        console.error("❌ Failed to fetch parent:", parentError.message);
        // Try listing all parents to see if table is accessible at all
        const { data: allParents, error: listError } = await supabase.from('parents').select('id, email').limit(5);
        if (listError) console.error("   Also failed to list parents:", listError.message);
        else console.log("   Available parents:", allParents);
        return;
    }

    console.log("✅ Parent found:", parentData);
    const parentId = parentData.id;

    // 2. Fetch Linked Children
    console.log(`\n2. Fetching children for Parent ID: ${parentId}`);
    const { data: relations, error: relationError } = await supabase
        .from('parent_children')
        .select('student_id')
        .eq('parent_id', parentId);

    if (relationError) {
        console.error("❌ Failed to fetch parent_children:", relationError.message);
        return;
    }

    console.log(`✅ Found ${relations.length} linked children.`);

    if (relations.length === 0) {
        console.warn("⚠️ No children linked to this parent. Skipping fee check.");
        return;
    }

    const studentIds = relations.map(r => r.student_id);
    console.log("   Student IDs:", studentIds);

    // 3. Fetch Fees for these students
    console.log(`\n3. Fetching fees for students: ${studentIds.join(', ')}`);

    for (const studentId of studentIds) {
        const { data: feeData, error: feeError } = await supabase
            .from('student_fees')
            .select('*')
            .eq('student_id', studentId);

        if (feeError) {
            console.error(`❌ Failed to fetch fees for student ${studentId}:`, feeError.message);
        } else {
            console.log(`✅ Fees for Student ${studentId}: Found ${feeData.length} records.`);
            if (feeData.length > 0) {
                console.log("   Sample Fee:", JSON.stringify(feeData[0], null, 2));
            }
        }
    }

    // 4. Fetch Payment Plans
    console.log(`\n4. Fetching payment plans for students: ${studentIds.join(', ')}`);
    for (const studentId of studentIds) {
        const { data: planData, error: planError } = await supabase
            .from('payment_plans')
            .select('*')
            .eq('student_id', studentId);

        if (planError) {
            // It might be okay if table doesn't exist or no plan, but let's check error
            if (planError.message.includes("does not exist")) {
                console.warn(`⚠️ Payment plans table might not exist or verify failed: ${planError.message}`);
            } else {
                console.log(`ℹ️ Payment plan query for Student ${studentId}: ${planError.message}`);
            }
        } else {
            console.log(`✅ Payment Plans for Student ${studentId}: Found ${planData.length} records.`);
        }
    }

    console.log("\nVerification Complete.");
}

verifyParentAccess();
