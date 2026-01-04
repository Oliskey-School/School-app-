-- Inspector Portal Complete Database Schema
-- Migration 0018: Inspector & Inspection System (SIMPLIFIED RLS VERSION)

-- =====================================================
-- DROP EXISTING TABLES IF THEY EXIST (SAFE MIGRATION)
-- =====================================================
DROP TABLE IF EXISTS public.inspection_responses CASCADE;
DROP TABLE IF EXISTS public.inspections CASCADE;
DROP TABLE IF EXISTS public.inspection_checklist_templates CASCADE;
DROP TABLE IF EXISTS public.inspectors CASCADE;

-- =====================================================
-- 1. INSPECTOR ACCOUNTS
-- =====================================================
CREATE TABLE public.inspectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    inspector_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    ministry_department TEXT,
    region TEXT,
    contact_email TEXT UNIQUE NOT NULL,
    contact_phone TEXT,
    digital_signature TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. INSPECTION RECORDS
-- =====================================================
CREATE TABLE public.inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL,
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('Annual', 'Spot Check', 'Follow-up', 'Re-inspection')),
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    overall_rating TEXT CHECK (overall_rating IN ('Outstanding', 'Good', 'Requires Improvement', 'Inadequate')),
    total_score INTEGER,
    max_score INTEGER,
    percentage DECIMAL(5,2),
    checklist_data JSONB DEFAULT '{}',
    evidence_files TEXT[] DEFAULT '{}',
    notes TEXT,
    recommendations TEXT,
    digitally_signed BOOLEAN DEFAULT false,
    signature_timestamp TIMESTAMP,
    report_pdf_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. INSPECTION CHECKLIST TEMPLATES
-- =====================================================
CREATE TABLE public.inspection_checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    questions JSONB NOT NULL,
    scoring_rubric JSONB,
    version TEXT DEFAULT '1.0',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4. INSPECTION CHECKLIST RESPONSES
-- =====================================================
CREATE TABLE public.inspection_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.inspection_checklist_templates(id),
    question_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    notes TEXT,
    evidence_photo TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_inspections_school ON public.inspections(school_id);
CREATE INDEX idx_inspections_inspector ON public.inspections(inspector_id);
CREATE INDEX idx_inspections_status ON public.inspections(status);
CREATE INDEX idx_inspections_date ON public.inspections(inspection_date);
CREATE INDEX idx_inspectors_email ON public.inspectors(contact_email);
CREATE INDEX idx_inspectors_code ON public.inspectors(inspector_code);
CREATE INDEX idx_inspection_responses_inspection ON public.inspection_responses(inspection_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES (SIMPLIFIED)
-- =====================================================
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_responses ENABLE ROW LEVEL SECURITY;

-- Inspectors can view their own data
CREATE POLICY "Inspectors can view own profile" ON public.inspectors
    FOR SELECT USING (auth.uid() = user_id);

-- Inspectors can update their own profile
CREATE POLICY "Inspectors can update own profile" ON public.inspectors
    FOR UPDATE USING (auth.uid() = user_id);

-- Inspectors can manage all inspections (simplified - view/create/update/delete their own)
CREATE POLICY "Inspectors can manage own inspections" ON public.inspections
    FOR ALL USING (
        inspector_id IN (
            SELECT id FROM public.inspectors WHERE user_id = auth.uid()
        )
    );

-- Allow public read access to inspections (can be restricted later)
CREATE POLICY "Public can view inspections" ON public.inspections
    FOR SELECT USING (true);

-- Everyone can view active checklist templates
CREATE POLICY "Public can view active templates" ON public.inspection_checklist_templates
    FOR SELECT USING (active = true);

-- Inspectors can manage their inspection responses
CREATE POLICY "Inspectors can manage responses" ON public.inspection_responses
    FOR ALL USING (
        inspection_id IN (
            SELECT id FROM public.inspections 
            WHERE inspector_id IN (
                SELECT id FROM public.inspectors WHERE user_id = auth.uid()
            )
        )
    );

-- Allow public read access to responses (can be restricted later)
CREATE POLICY "Public can view responses" ON public.inspection_responses
    FOR SELECT USING (true);

-- =====================================================
-- 7. SEED DEFAULT INSPECTION CHECKLISTS
-- =====================================================
INSERT INTO public.inspection_checklist_templates (title, category, questions, version, active) VALUES
(
    'Documentation Compliance',
    'Documentation',
    '[
        {"id": 1, "question": "Is the school operating license valid and displayed?", "max_points": 5, "required": true},
        {"id": 2, "question": "Is the fire safety certificate current (within 1 year)?", "max_points": 5, "required": true},
        {"id": 3, "question": "Is insurance coverage adequate and current?", "max_points": 5, "required": true},
        {"id": 4, "question": "Is safeguarding/child protection policy uploaded and accessible?", "max_points": 5, "required": true}
    ]'::jsonb,
    '1.0',
    true
),
(
    'Facilities & Infrastructure',
    'Facilities',
    '[
        {"id": 1, "question": "Are classrooms adequate for enrollment numbers?", "max_points": 5, "required": true},
        {"id": 2, "question": "Are toilets clean, functional, and gender-separated?", "max_points": 5, "required": true},
        {"id": 3, "question": "Is the library accessible with adequate resources?", "max_points": 5, "required": false},
        {"id": 4, "question": "Are science labs equipped with necessary materials?", "max_points": 5, "required": false},
        {"id": 5, "question": "Are fire extinguishers present and serviced?", "max_points": 5, "required": true},
        {"id": 6, "question": "Is playground equipment safe and maintained?", "max_points": 5, "required": false}
    ]'::jsonb,
    '1.0',
    true
),
(
    'Teaching Quality & Curriculum',
    'Teaching Quality',
    '[
        {"id": 1, "question": "Are teachers qualified for their assigned subjects?", "max_points": 5, "required": true},
        {"id": 2, "question": "Is curriculum alignment evident (Nigerian/British)?", "max_points": 5, "required": true},
        {"id": 3, "question": "Are lesson plans documented and followed?", "max_points": 5, "required": false},
        {"id": 4, "question": "Is student engagement and participation evident?", "max_points": 5, "required": false},
        {"id": 5, "question": "Are assessment records maintained properly?", "max_points": 5, "required": true},
        {"id": 6, "question": "Is dual curriculum properly managed (if applicable)?", "max_points": 5, "required": false}
    ]'::jsonb,
    '1.0',
    true
),
(
    'Health, Safety & Child Protection',
    'Health & Safety',
    '[
        {"id": 1, "question": "Is a first aid kit available and stocked?", "max_points": 5, "required": true},
        {"id": 2, "question": "Are emergency exits clearly marked and unobstructed?", "max_points": 5, "required": true},
        {"id": 3, "question": "Are fire drill records documented (minimum 2 per term)?", "max_points": 5, "required": true},
        {"id": 4, "question": "Is an incident reporting system in place?", "max_points": 5, "required": true}
    ]'::jsonb,
    '1.0',
    true
);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_inspection_score(inspection_uuid UUID)
RETURNS TABLE(total_score INTEGER, max_score INTEGER, percentage DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(score), 0)::INTEGER as total_score,
        COALESCE(SUM(
            (jsonb_array_elements(ict.questions)->>'max_points')::INTEGER
        ), 0)::INTEGER as max_score,
        CASE 
            WHEN COALESCE(SUM((jsonb_array_elements(ict.questions)->>'max_points')::INTEGER), 0) > 0
            THEN (COALESCE(SUM(score), 0)::DECIMAL / 
                  COALESCE(SUM((jsonb_array_elements(ict.questions)->>'max_points')::INTEGER), 1)::DECIMAL * 100)
            ELSE 0
        END as percentage
    FROM public.inspection_responses ir
    JOIN public.inspection_checklist_templates ict ON ir.template_id = ict.id
    WHERE ir.inspection_id = inspection_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '🎉 Inspector Portal Database Created Successfully!' as status,
       '📊 4 inspection categories seeded (100 points total)' as categories,
       '🔐 Simplified RLS policies enabled' as security,
       '✅ Ready for pilot testing!' as next_step;
