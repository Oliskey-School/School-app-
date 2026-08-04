// Canonical Learning Hub levels and subjects — see CLAUDE.md "Standard User ID
// Format" / academic level list. Filters show the full list so every class and
// subject is selectable; only some combinations have curated content seeded so
// far (see backend/prisma/seed-learning-hub.ts), and admins can add more via
// the Learning Hub curation screen.
export const LEARNING_HUB_LEVELS = [
  'Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JSS 1', 'JSS 2', 'JSS 3',
  'SSS 1', 'SSS 2', 'SSS 3',
];

// Converts a Class.grade integer (1-12) into the level label used throughout
// the Learning Hub ("Primary 4", "JSS 1", "SSS 2"). Mirrors the mapping already
// used in components/student/SubjectsScreen.tsx.
export const gradeToLevel = (grade?: number | null): string | undefined => {
  if (!grade) return undefined;
  if (grade >= 1 && grade <= 6) return `Primary ${grade}`;
  if (grade >= 7 && grade <= 9) return `JSS ${grade - 6}`;
  if (grade >= 10 && grade <= 12) return `SSS ${grade - 9}`;
  return undefined;
};

// PhET's own "Customize" filter taxonomy (see phet.colorado.edu/en/simulations/filter
// and phet.colorado.edu/en/inclusive-design/features) — independent of our own
// curriculum grade_level/subject fields, since PhET organizes by its own subject
// areas and grade bands rather than a specific school subject.
export const PHET_SUBJECT_AREAS = ['Physics', 'Chemistry', 'Math & Statistics', 'Earth & Space', 'Biology'];
export const PHET_GRADE_BANDS = ['Elementary School', 'Middle School', 'High School', 'University'];
export const PHET_INCLUSIVE_FEATURES = ['Alternative Input', 'Sonification', 'Interactive Description', 'Pan and Zoom', 'Voicing'];

export const LEARNING_HUB_SUBJECTS = [
  'English Language', 'Mathematics', 'Basic Mathematics', 'Further Mathematics',
  'Science', 'Basic Science', 'Biology', 'Chemistry', 'Physics',
  'Computer Studies', 'Coding & Programming',
  'Civic Education', 'Social Studies', 'History', 'Geography', 'Government',
  'Economics', 'Commerce', 'Financial Accounting', 'Literature in English',
  'CRS', 'IRS', 'Agricultural Science', 'Business Studies',
  'Home Economics', 'Food & Nutrition', 'Technical Drawing', 'Fine Art', 'Music',
  'French', 'Yoruba',
];
