
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
    console.error('Missing Supabase URL or Service Key.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// --- HELPER from useTeacherClasses.ts ---
const parseClassName = (name) => {
    const clean = name.trim();
    let grade = 0;
    let section = '';

    const standardMatch = clean.match(/^(?:Grade|Year)?\s*(\d+)\s*(.*)$/i);
    const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
    const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i);
    const primaryMatch = clean.match(/^Primary\s*(\d+)\s*(.*)$/i);

    if (standardMatch) {
        grade = parseInt(standardMatch[1]);
        section = standardMatch[2];
    } else if (jsMatch) {
        grade = 6 + parseInt(jsMatch[1]);
        section = jsMatch[2];
    } else if (ssMatch) {
        grade = 9 + parseInt(ssMatch[1]);
        section = ssMatch[2];
    } else if (primaryMatch) {
        grade = parseInt(primaryMatch[1]);
        section = primaryMatch[2];
    }

    section = section.replace(/^[-–]\s*/, '').trim();
    return { grade, section };
};
// ----------------------------------------

async function verifyTeacherStats() {
    console.log('--- Verifying Teacher Stats Logic (Multi-Match) ---');

    const TARGET_ID = 'OLISKEY_MAIN_TCH_0001';

    // 1. Get Teacher
    const { data: teacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_generated_id', TARGET_ID)
        .single();

    if (!teacher) { console.error('Teacher not found'); return; }
    console.log(`Teacher: ${teacher.name} (${teacher.id})`);

    // 2. Fetch Legacy Assignments
    const { data: legacy } = await supabase
        .from('teacher_classes')
        .select('class_name')
        .eq('teacher_id', teacher.id);

    const { data: allClasses } = await supabase
        .from('classes')
        .select('id, name, grade, section')
        .eq('school_id', teacher.school_id);

    const resolvedClasses = [];
    const addedIds = new Set();
    const normalize = (s) => s.replace(/Grade|Year|JSS|SSS|SS|\s/gi, '').toUpperCase();

    // 3. Apply Multi-Match Logic
    legacy.forEach(l => {
        const parsed = parseClassName(l.class_name);
        // console.log(`Parsing "${l.class_name}" -> Grade: ${parsed.grade}, Section: "${parsed.section}"`);

        const matches = allClasses.filter(c => {
            if (c.name === l.class_name) return true;

            if (c.grade === parsed.grade) {
                if (parsed.section) {
                    return normalize(c.section || '') === normalize(parsed.section);
                }
                return true; // Match ALL sections if none specified (e.g. "Primary 4" matches "Primary 4 A", "Primary 4 B")
            }
            return false;
        });

        matches.forEach(match => {
            if (!addedIds.has(match.id)) {
                resolvedClasses.push(match);
                addedIds.add(match.id);
            }
        });
    });

    console.log(`Resolved Classes: ${resolvedClasses.length}`);
    resolvedClasses.forEach(c => console.log(` - ${c.name} (ID: ${c.id})`));

    // 4. Calculate Students
    let totalStudents = 0;
    if (resolvedClasses.length > 0) {
        const classIds = resolvedClasses.map(c => c.id);
        const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .in('current_class_id', classIds)
            .eq('status', 'Active');

        totalStudents = count || 0;
    }

    console.log(`\n✅ Calculated Total Students: ${totalStudents}`);
    console.log(`✅ Calculated Total Classes: ${resolvedClasses.length}`);

    if (totalStudents > 0) {
        console.log('\nResult: SUCCESS! Multi-match logic correctly found students.');
    } else {
        console.error('\nResult: FAILURE. Still 0 students.');
    }
}

verifyTeacherStats();
