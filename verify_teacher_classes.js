
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try generic dotenv
try {
    require('dotenv').config();
} catch (e) {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or Service Key (needed to bypass RLS for debug).');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function verifyTeacherClasses() {
    console.log('--- Verifying Teacher Class Fetching ---');

    const TARGET_ID = 'OLISKEY_MAIN_TCH_0021';
    console.log(`Looking up teacher: ${TARGET_ID}`);

    // 1. Get Teacher Record
    const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_generated_id', TARGET_ID)
        .single();

    if (teacherError || !teacher) {
        console.error('❌ Teacher not found:', teacherError);
        return;
    }

    console.log(`✅ Found Teacher: ${teacher.name} (UUID: ${teacher.id})`);
    console.log(`   School ID: ${teacher.school_id}`);

    const resolvedTeacherId = teacher.id;
    const schoolId = teacher.school_id;

    // 2. Check class_teachers (Modern Assignments)
    const { data: modern, error: modernError } = await supabase
        .from('class_teachers')
        .select(`
            class_id,
            classes (id, name, grade, section)
        `)
        .eq('teacher_id', resolvedTeacherId);

    if (modernError) console.error('Error fetching modern classes:', modernError);
    console.log(`   Modern Assignments (class_teachers): ${modern?.length || 0}`);
    if (modern?.length > 0) {
        modern.forEach(m => console.log(`     - ${m.classes?.name} (${m.classes?.grade}${m.classes?.section})`));
    }

    // 3. Check teacher_classes (Legacy Assignments)
    const { data: legacy, error: legacyError } = await supabase
        .from('teacher_classes')
        .select('class_name')
        .eq('teacher_id', resolvedTeacherId);

    if (legacyError) console.error('Error fetching legacy classes:', legacyError);
    console.log(`   Legacy Assignments (teacher_classes): ${legacy?.length || 0}`);
    if (legacy?.length > 0) {
        legacy.forEach(l => console.log(`     - "${l.class_name}"`));
    }

    // 4. Simulate Resolution Logic
    if (legacy?.length > 0) {
        if (!schoolId) {
            console.warn('   ⚠️ PROBLEM: Legacy assignments exist but School ID is missing! Cannot resolve classes.');
        } else {
            console.log(`   Resolving legacy classes against School ID: ${schoolId}`);
            const { data: allClasses } = await supabase
                .from('classes')
                .select('id, name, grade, section')
                .eq('school_id', schoolId);

            console.log(`   Found ${allClasses?.length} potential classes in school.`);

            // Try matching
            const normalize = (s) => s.replace(/Grade|Year|JSS|SSS|SS|\s/gi, '').toUpperCase();

            legacy.forEach(l => {
                const name = l.class_name;
                console.log(`     Matching "${name}"...`);
                // Simple match simulation
                const match = allClasses.find(c => {
                    if (c.name === name) return true;
                    const cNorm = normalize(`${c.grade}${c.section || ''}`);
                    const lNorm = normalize(name);
                    return cNorm === lNorm;
                });
                if (match) console.log(`       ✅ Matched! -> ${match.name} (${match.id})`);
                else console.log(`       ❌ No match found.`);
            });
        }
    }
}

verifyTeacherClasses();
