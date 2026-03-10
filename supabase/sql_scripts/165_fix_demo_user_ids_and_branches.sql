-- Migration 165: Fix demo account IDs and branch assignments for Phase 2
-- Applied: 2026-03-09

-- Fix admin user@school.com: had STU role code, correct to ADM
UPDATE users
SET school_generated_id = 'OLISKEY_MAIN_ADM_0001',
    branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE email = 'user@school.com'
  AND school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

-- Fix teacher john.smith@demo.com: assign main branch
UPDATE users
SET branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE email = 'john.smith@demo.com'
  AND school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

-- Fix parent parent1@demo.com: assign main branch
UPDATE users
SET branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE email = 'parent1@demo.com'
  AND school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

-- Fix student student1@demo.com: assign main branch
UPDATE users
SET branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE email = 'student1@demo.com'
  AND school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

-- Fix role tables too
UPDATE teachers SET branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE email = 'john.smith@demo.com' AND school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' AND branch_id IS NULL;

UPDATE parents SET branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE email = 'parent1@demo.com' AND school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' AND branch_id IS NULL;

UPDATE students SET branch_id = '7601cbea-e1ba-49d6-b59b-412a584cb94f'
WHERE email = 'student1@demo.com' AND school_id = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' AND branch_id IS NULL;
