-- Remove Learning Hub resources whose source is confirmed (via live HTTP
-- header check against X-Frame-Options / CSP frame-ancestors) to block
-- iframe embedding: ReadTheory, NASA STEM, CK-12, BBC Bitesize, and PhET's
-- general (non-simulation-runner) browse page. These were seeded before the
-- embeddability was verified; removing them here keeps every environment's
-- Learning Hub catalog consistent — no card should ever silently fall back to
-- "open externally".

DELETE FROM "Resource"
WHERE is_curated = true
  AND source_name IN ('ReadTheory', 'NASA STEM', 'CK-12', 'BBC Bitesize');

DELETE FROM "Resource"
WHERE is_curated = true
  AND url = 'https://phet.colorado.edu/en/simulations/browse';
