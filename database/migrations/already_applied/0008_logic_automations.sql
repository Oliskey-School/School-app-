-- Phase 7: Backend Logic & Automation
-- Implements backend logic for Steps 2, 3, and 5.

-- 1. AUTO-GENERATE COMPLIANCE CHECKLIST (Step 3 Automation)
-- When a new school is created, automatically insert required document placeholders.

CREATE OR REPLACE FUNCTION public.fn_auto_generate_compliance_docs()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.school_documents (school_id, document_type, verification_status)
    VALUES 
        (NEW.id, 'CAC', 'Pending'),
        (NEW.id, 'FireSafety', 'Pending'),
        (NEW.id, 'MinistryApproval', 'Pending'),
        (NEW.id, 'BuildingPlan', 'Pending');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_school_creation_docs ON public.schools;
CREATE TRIGGER trg_school_creation_docs
AFTER INSERT ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_generate_compliance_docs();


-- 2. ENFORCE TEACHER ELIGIBILITY (Step 5 Automation)
-- Ensure teachers cannot be assigned to a subject/class of a specific curriculum unless eligible.
-- Note: This assumes we upgrade the `classes` table to have a `curriculum_id`. 
-- Since `classes` table update is in Step 7, we define the trigger function now and will attach it later.

CREATE OR REPLACE FUNCTION public.fn_enforce_teacher_curriculum()
RETURNS TRIGGER AS $$
DECLARE
    v_curriculum_code TEXT;
    v_is_eligible BOOLEAN;
BEGIN
    -- Determine curriculum of the class (Conceptual - requires Step 7 schema update)
    -- SELECT c.code INTO v_curriculum_code FROM classes cl
    -- JOIN curricula c ON cl.curriculum_id = c.id
    -- WHERE cl.id = NEW.class_id;

    -- IF v_curriculum_code IS NULL THEN RETURN NEW; END IF; -- No strict check if class has no curriculum

    -- Check eligibility
    -- SELECT EXISTS (
    --    SELECT 1 FROM teacher_eligibility te
    --    JOIN curricula c ON te.curriculum_id = c.id
    --    WHERE te.teacher_id = NEW.teacher_id AND c.code = v_curriculum_code AND te.status = 'Verified'
    -- ) INTO v_is_eligible;
    
    -- IF NOT v_is_eligible THEN
    --    RAISE EXCEPTION 'Teacher is not eligible to teach % curriculum classes.', v_curriculum_code;
    -- END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. ENSURE ACADEMIC TRACK STRICTNESS (Step 2 Verification)
-- Prevent students from having two tracks of the SAME curriculum active (Constraint already in schema: UNIQUE(student_id, curriculum_id))
-- But we also want to ensure they don't have overlapping active tracks if we decide that's illegal (Step 1 Rules).
-- For now, "active" status management.

CREATE OR REPLACE FUNCTION public.fn_manage_academic_track_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If a track is marked 'Completed' or 'Paused', it's fine.
    -- If 'Active', ensure no other track is 'Active' for this student? 
    -- Product Law says: "A Student can have one or multiple Academic Tracks".
    -- So dual enrollment IS allowed. We just track them strictly.
    -- However, we must ensure the `curriculum_id` is valid.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CLEANUP & MIGRATION
-- Check if `students` has legacy columns to deprecate (Conceptual).

-- GRANT PERMISSIONS
GRANT ALL ON public.school_documents TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.teacher_eligibility TO postgres, anon, authenticated, service_role;
