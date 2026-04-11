export type CurriculumType = 'nigerian' | 'british';

export interface GradeScale {
    grade: string;
    minScore: number;
    maxScore: number;
    description: string;
    color: string;
}

const NIGERIAN_SCALE: GradeScale[] = [
    { grade: 'A', minScore: 75, maxScore: 100, description: 'Excellent', color: 'text-emerald-600' },
    { grade: 'B', minScore: 65, maxScore: 74, description: 'Very Good', color: 'text-blue-600' },
    { grade: 'C', minScore: 50, maxScore: 64, description: 'Good', color: 'text-indigo-600' },
    { grade: 'D', minScore: 45, maxScore: 49, description: 'Pass', color: 'text-amber-600' },
    { grade: 'E', minScore: 40, maxScore: 44, description: 'Poor', color: 'text-orange-600' },
    { grade: 'F', minScore: 0, maxScore: 39, description: 'Fail', color: 'text-red-600' },
];

const BRITISH_SCALE: GradeScale[] = [
    { grade: '9', minScore: 90, maxScore: 100, description: 'Outstanding', color: 'text-emerald-600' },
    { grade: '8', minScore: 80, maxScore: 89, description: 'Excellent', color: 'text-emerald-500' },
    { grade: '7', minScore: 70, maxScore: 79, description: 'Very Good', color: 'text-blue-600' },
    { grade: '6', minScore: 60, maxScore: 69, description: 'Good', color: 'text-blue-500' },
    { grade: '5', minScore: 50, maxScore: 59, description: 'Strong Pass', color: 'text-indigo-600' },
    { grade: '4', minScore: 40, maxScore: 49, description: 'Standard Pass', color: 'text-amber-600' },
    { grade: 'U', minScore: 0, maxScore: 39, description: 'Ungraded', color: 'text-red-600' },
];

/**
 * Automatically determines the grade based on raw score and curriculum.
 */
export function calculateGrade(score: number, curriculum: CurriculumType): GradeScale {
    const scale = curriculum === 'nigerian' ? NIGERIAN_SCALE : BRITISH_SCALE;
    const result = scale.find(s => score >= s.minScore && score <= s.maxScore);
    return result || scale[scale.length - 1]; // Fallback to lowest grade
}

/**
 * Calculates weighted score for continuous assessments (CA).
 * Example: CA1 (10%), CA2 (10%), Exam (60%).
 */
export function calculateTotalScore(scores: { value: number, weight: number }[]): number {
    const total = scores.reduce((sum, s) => sum + (s.value * (s.weight / 100)), 0);
    return Math.round(total * 10) / 10;
}
