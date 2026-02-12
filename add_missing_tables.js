const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function addMissingTables() {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (e) {
        console.error('.env file not found');
        process.exit(1);
    }

    const envVars = {};
    const lines = envContent.split('\n');
    for (const line of lines) {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    }

    const supabaseUrl = envVars['VITE_SUPABASE_URL'];
    const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking missing tables...');
    
    const tables = ['compliance_snapshots', 'inspection_checklist_templates', 'inspection_responses'];
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(0);
        if (error && error.code === '42P01') {
            console.log(`❌ Table "${table}" is definitely missing.`);
        } else if (error) {
            console.log(`⚠️ Table "${table}" check error:`, error.message);
        } else {
            console.log(`✅ Table "${table}" exists.`);
        }
    }

    console.log('\n--- SQL TO RUN IN SUPABASE SQL EDITOR ---');
    console.log(`
-- 1. Inspection Checklist Templates
CREATE TABLE IF NOT EXISTS public.inspection_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Inspection Responses
CREATE TABLE IF NOT EXISTS public.inspection_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL,
    template_id UUID REFERENCES public.inspection_checklist_templates(id),
    question_id INTEGER NOT NULL,
    score INTEGER,
    notes TEXT,
    evidence_photo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Compliance Snapshots
CREATE TABLE IF NOT EXISTS public.compliance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    facilities_score INTEGER,
    equipment_score INTEGER,
    safety_score INTEGER,
    safeguarding_score INTEGER,
    overall_score INTEGER,
    snapshot_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.inspection_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_snapshots ENABLE ROW LEVEL SECURITY;
    `);
}

addMissingTables();