SELECT 
    (SELECT COUNT(*) FROM "Student") as student_count,
    (SELECT COUNT(*) FROM "Teacher") as teacher_count,
    (SELECT COUNT(*) FROM "Parent") as parent_count,
    (SELECT COUNT(DISTINCT grade) FROM "Class") as academic_levels;