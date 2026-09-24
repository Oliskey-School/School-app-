-- Row level security for tenant-owned tables that carry no school_id of their own.
--
-- These seven tables hold real tenant data (incident evidence and letters,
-- classroom-observation scores, study-plan contents, a class's subjects) but are
-- linked to their school only through a parent row. They had NO policy at all,
-- so the database offered no protection: a query that forgot to join through
-- the parent returned — or wrote — another school's rows. The stated
-- architecture is that isolation is enforced at the data layer, not only in
-- application code; these tables were the exception.
--
-- A child row is visible/writable exactly when its PARENT row is. The parent is
-- itself RLS-protected, and Postgres applies RLS to tables referenced inside a
-- policy expression, so the child automatically inherits the parent's school
-- AND branch scoping (and the explicit platform bypass) with no duplication.
--
-- Idempotent: safe to re-run.

-- Evidence, letters, decisions and stage logs hang off SOPCase.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['SOPEvidence','SOPLetter','SOPDecision','SOPCaseStageLog'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$CREATE POLICY tenant_isolation ON %I
      USING (EXISTS (SELECT 1 FROM "SOPCase" p WHERE p.id = case_id))
      WITH CHECK (EXISTS (SELECT 1 FROM "SOPCase" p WHERE p.id = case_id))$f$, t);
  END LOOP;
END $$;

-- Workflow stages hang off SOPIncidentType.
ALTER TABLE "SOPWorkflowStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SOPWorkflowStage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SOPWorkflowStage";
CREATE POLICY tenant_isolation ON "SOPWorkflowStage"
  USING (EXISTS (SELECT 1 FROM "SOPIncidentType" p WHERE p.id = incident_type_id))
  WITH CHECK (EXISTS (SELECT 1 FROM "SOPIncidentType" p WHERE p.id = incident_type_id));

-- Observation answers hang off ClassroomObservation.
ALTER TABLE "ObservationResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObservationResponse" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ObservationResponse";
CREATE POLICY tenant_isolation ON "ObservationResponse"
  USING (EXISTS (SELECT 1 FROM "ClassroomObservation" p WHERE p.id = observation_id))
  WITH CHECK (EXISTS (SELECT 1 FROM "ClassroomObservation" p WHERE p.id = observation_id));

-- Study plan items hang off StudyPlan.
ALTER TABLE "StudyPlanItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudyPlanItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StudyPlanItem";
CREATE POLICY tenant_isolation ON "StudyPlanItem"
  USING (EXISTS (SELECT 1 FROM "StudyPlan" p WHERE p.id = study_plan_id))
  WITH CHECK (EXISTS (SELECT 1 FROM "StudyPlan" p WHERE p.id = study_plan_id));

-- Prisma's implicit Class<->Subject join table: "A" is Class, "B" is Subject.
-- Both sides must belong to a school the caller can see, so a row can never
-- staple one school's subject onto another school's class.
ALTER TABLE "_ClassToSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_ClassToSubject" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "_ClassToSubject";
CREATE POLICY tenant_isolation ON "_ClassToSubject"
  USING (EXISTS (SELECT 1 FROM "Class" c WHERE c.id = "A") AND EXISTS (SELECT 1 FROM "Subject" s WHERE s.id = "B"))
  WITH CHECK (EXISTS (SELECT 1 FROM "Class" c WHERE c.id = "A") AND EXISTS (SELECT 1 FROM "Subject" s WHERE s.id = "B"));
