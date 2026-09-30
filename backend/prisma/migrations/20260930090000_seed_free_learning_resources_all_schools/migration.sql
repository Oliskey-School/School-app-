-- Give every school the curated "Free Learning Resources" catalog.
--
-- THE BUG: the catalog is per-school data. LearningHubService.getResources
-- filters `school_id = <caller's school> AND is_curated`, but the 13 curated
-- website rows only ever existed for the DEMO school — they were inserted
-- ad hoc and no migration, seeder or onboarding step ever created them for
-- anyone else. So the screen worked in the demo and was empty for every real
-- school in production: "No resources match your search", for every student
-- and teacher, since the feature shipped.
--
-- THE FIX: this backfills the catalog into every existing school that has none,
-- and SchoolService.onboardSchool seeds the same list for each new school, so
-- the two paths cannot drift apart again.
--
-- The rows below were generated from the demo school's live catalog rather than
-- retyped, so titles, URLs, categories, tags and age bands are exactly the
-- vetted entries the app already ships — including the embeddability vetting
-- migration 20260731030000 applied when it removed the sources that refuse to
-- be framed. Nothing here is invented.
--
-- Idempotent: a school is skipped when it already has a curated website row, so
-- re-running (or a school onboarded between deploy and this migration) cannot
-- produce duplicates.

DO $$
DECLARE s record; inserted int := 0; skipped int := 0;
BEGIN
  FOR s IN SELECT id FROM "School" LOOP
    IF EXISTS (
      SELECT 1 FROM "Resource"
       WHERE school_id = s.id AND is_curated = true
         AND resource_kind = 'website' AND deleted_at IS NULL
    ) THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO "Resource"
      (id, school_id, branch_id, title, description, url, source_name, category,
       subject, grade_level, recommended_age, tags, resource_kind, type,
       curriculum_type, is_curated, created_at, updated_at)
    SELECT gen_random_uuid()::text, s.id, NULL, v.title, v.description, v.url,
           v.source_name, v.category, v.subject, v.grade_level, v.recommended_age,
           v.tags, v.resource_kind, v.type, v.curriculum_type, true, now(), now()
      FROM (VALUES
    ('Blockly Games', 'Free block-based coding puzzles that teach programming logic without needing to type code.', 'https://blockly.games/', 'Blockly Games', 'Computer Studies & Coding', NULL, NULL, 'Primary 3 - JSS 3', ARRAY['Computer Studies','Coding & Programming']::text[], 'website', 'link', NULL),
    ('Code.org', 'Free coding lessons and Hour of Code tutorials for every age, from block-based to real code.', 'https://code.org/', 'Code.org', 'Computer Studies & Coding', NULL, NULL, 'Creche - SSS3', ARRAY['Computer Studies','Coding & Programming']::text[], 'website', 'link', NULL),
    ('AdaptedMind — English Practice', 'Free adaptive reading and grammar practice games that adjust to the student''s level.', 'https://www.adaptedmind.com/', 'AdaptedMind', 'English', NULL, NULL, 'Primary 1 - Primary 6', ARRAY['English Language']::text[], 'website', 'link', NULL),
    ('National Geographic Kids', 'Free articles, facts, photos, and games about animals, places, and cultures around the world.', 'https://kids.nationalgeographic.com/', 'National Geographic Kids', 'Geography & Social Studies', NULL, NULL, 'Primary 1 - JSS 3', ARRAY['Geography','Social Studies']::text[], 'website', 'link', NULL),
    ('Desmos Graphing Calculator', 'Free, powerful graphing calculator used in classrooms worldwide — no signup needed to graph.', 'https://www.desmos.com/calculator', 'Desmos', 'Mathematics', NULL, NULL, 'JSS 1 - SSS 3', ARRAY['Mathematics']::text[], 'website', 'link', NULL),
    ('GeoGebra Classic', 'Free graphing calculator, geometry, algebra, and statistics tools in one app.', 'https://www.geogebra.org/classic', 'GeoGebra', 'Mathematics', NULL, NULL, 'JSS 1 - SSS 3', ARRAY['Mathematics']::text[], 'website', 'link', NULL),
    ('Math Is Fun', 'Math explained in plain language, with illustrated lessons, puzzles, and games from basic numbers to calculus.', 'https://www.mathsisfun.com/', 'Math Is Fun', 'Mathematics', NULL, NULL, 'Primary 1 - SSS 3', ARRAY['Mathematics']::text[], 'website', 'link', NULL),
    ('PhET — Fraction Matcher', 'Free, research-based interactive math simulations from the University of Colorado Boulder.', 'https://phet.colorado.edu/sims/html/fraction-matcher/latest/fraction-matcher_en.html', 'PhET Interactive Simulations', 'Mathematics', NULL, NULL, 'Primary 3 - JSS 2', ARRAY['Mathematics']::text[], 'website', 'link', NULL),
    ('Shodor Interactivate', 'Free interactive courseware for exploring math concepts through activities and simulations.', 'https://www.shodor.org/interactivate/', 'Shodor Interactivate', 'Mathematics', NULL, NULL, 'Primary 4 - SSS 3', ARRAY['Mathematics']::text[], 'website', 'link', NULL),
    ('PhET — Gravity and Orbits', 'Explore gravity, orbits, and how planets and moons move through space.', 'https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_en.html', 'PhET Interactive Simulations', 'STEM & Interactive Learning', NULL, NULL, 'Primary 4 - SSS 1', ARRAY['STEM','Basic Science']::text[], 'website', 'link', NULL),
    ('Shodor Interactivate — STEM', 'Free interactive STEM activities blending math and science exploration.', 'https://www.shodor.org/interactivate/', 'Shodor Interactivate', 'STEM & Interactive Learning', NULL, NULL, 'Primary 4 - SSS 3', ARRAY['STEM','Mathematics','Basic Science']::text[], 'website', 'link', NULL),
    ('PhET — States of Matter', 'Explore atoms and molecules changing between solid, liquid, and gas states.', 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html', 'PhET Interactive Simulations', 'Science', NULL, NULL, 'Primary 5 - JSS 3', ARRAY['Basic Science','Science']::text[], 'website', 'link', NULL),
    ('Shodor Interactivate — Science', 'Free interactive science activities and simulations for exploring core science concepts.', 'https://www.shodor.org/interactivate/', 'Shodor Interactivate', 'Science', NULL, NULL, 'Primary 4 - SSS 3', ARRAY['Basic Science','Science']::text[], 'website', 'link', NULL)
      ) AS v(title, description, url, source_name, category, subject, grade_level,
             recommended_age, tags, resource_kind, type, curriculum_type);

    inserted := inserted + 1;
  END LOOP;

  RAISE NOTICE 'Free Learning Resources catalog: seeded % school(s), % already had it', inserted, skipped;
END $$;
