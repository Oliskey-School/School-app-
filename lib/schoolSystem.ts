// Helper function to get display name for grade levels
export function getGradeDisplayName(grade: number): string {
    const gradeNames: { [key: number]: string } = {
        0: 'Pre-Nursery',
        1: 'Nursery 1',
        2: 'Nursery 2',
        3: 'Basic 1',
        4: 'Basic 2',
        5: 'Basic 3',
        6: 'Basic 4',
        7: 'Basic 5',
        8: 'Basic 6',
        9: 'JSS 1',
        10: 'JSS 2',
        11: 'JSS 3',
        12: 'SSS 1',
        13: 'SSS 2',
        14: 'SSS 3',
    };

    return gradeNames[grade] || `Grade ${grade}`;
}

// Helper function to get school level category
export function getSchoolLevel(grade: number): string {
    if (grade >= 0 && grade <= 2) return 'Early Years';
    if (grade >= 3 && grade <= 8) return 'Primary';
    if (grade >= 9 && grade <= 11) return 'Junior Secondary';
    if (grade >= 12 && grade <= 14) return 'Senior Secondary';
    return 'Unknown';
}

// Helper function to get subjects for a grade and department
export function getSubjectsForGrade(grade: number, department?: string): string[] {
    // 🧸 EARLY YEARS (Pre-Nursery & Nursery) - Activity Areas
    if (grade >= 0 && grade <= 2) {
        return [
            'Numeracy (Number Work)',
            'Literacy (Letter Work/Phonics)',
            'Discovery Science',
            'Social Habits',
            'Health Habits',
            'Creative Arts',
            'Rhymes/Poems',
            'Handwriting',
            'Religious Knowledge'
        ];
    }

    // 🏫 PRIMARY SCHOOL (Basic 1-6) - Lower Basic (1-3) and Middle Basic (4-6)
    if (grade >= 3 && grade <= 8) {
        const coreSubjects = [
            'English Studies',
            'Mathematics',
            'Basic Science and Technology',
            'Social Studies',
            'Civic Education',
            'Security Education',
            'Cultural and Creative Arts (CCA)',
            'Nigerian Language',
            'Physical and Health Education (PHE)',
            'Computer Studies/ICT',
            'Agriculture/Home Economics',
            'Christian Religious Studies (CRS)',
            'Islamic Studies (IRS)'
        ];

        // French is introduced from Basic 4 (Grade 6)
        if (grade >= 6) {
            coreSubjects.push('French Language');
        }

        return coreSubjects;
    }

    // 🎓 JUNIOR SECONDARY (JSS 1-3) - Upper Basic
    if (grade >= 9 && grade <= 11) {
        return [
            // Core Compulsory
            'English Language',
            'Mathematics',
            'Basic Science',
            'Social Studies',
            'Civic Education',

            // Vocational/Technical
            'Basic Technology',
            'Agricultural Science',
            'Home Economics',
            'Business Studies',

            // Arts & Languages
            'Cultural & Creative Arts (CCA)',
            'French Language',
            'Nigerian Language',
            'Music',

            // Religion
            'Christian Religious Studies (CRS)',
            'Islamic Studies (IRS)',

            // Digital
            'Computer Studies'
        ];
    }

    // 🚀 SENIOR SECONDARY (SSS 1-3)
    if (grade >= 12 && grade <= 14) {
        // Core Compulsory Subjects (For All Tracks)
        const coreSubjects = [
            'English Language',
            'General Mathematics',
            'Civic Education',
            'Data Processing',
            'Biology'
        ];

        // Science Track
        if (department === 'Science') {
            return [
                ...coreSubjects,
                'Physics',
                'Chemistry',
                'Further Mathematics',
                'Geography',
                'Agricultural Science',
                'Technical Drawing'
            ];
        }

        // Arts Track
        if (department === 'Arts') {
            return [
                ...coreSubjects,
                'Literature-in-English',
                'Government',
                'History',
                'Christian Religious Studies (CRS)',
                'Islamic Studies (IRS)',
                'Nigerian Language (Hausa/Igbo/Yoruba)',
                'Fine Arts',
                'Geography'
            ];
        }

        // Commercial Track
        if (department === 'Commercial') {
            return [
                ...coreSubjects,
                'Financial Accounting',
                'Commerce',
                'Economics',
                'Government',
                'Marketing',
                'Office Practice',
                'Business Studies'
            ];
        }

        // Default (if no department specified)
        return coreSubjects;
    }

    // Default fallback
    return ['English Language', 'Mathematics'];
}

// Get all subjects by category for a specific level
export function getSubjectsByCategory(grade: number, department?: string): {
    category: string;
    subjects: string[];
}[] {
    // Early Years
    if (grade >= 0 && grade <= 2) {
        return [
            {
                category: 'Activity Areas',
                subjects: getSubjectsForGrade(grade)
            }
        ];
    }

    // Primary
    if (grade >= 3 && grade <= 8) {
        return [
            {
                category: 'Core Subjects',
                subjects: [
                    'English Studies',
                    'Mathematics',
                    'Basic Science and Technology',
                    'Social Studies',
                    'Civic Education'
                ]
            },
            {
                category: 'Languages & Arts',
                subjects: [
                    'Nigerian Language',
                    'Cultural and Creative Arts (CCA)',
                    ...(grade >= 6 ? ['French Language'] : [])
                ]
            },
            {
                category: 'Religion & Values',
                subjects: [
                    'Christian Religious Studies (CRS)',
                    'Islamic Studies (IRS)',
                    'Security Education'
                ]
            },
            {
                category: 'Practical Subjects',
                subjects: [
                    'Physical and Health Education (PHE)',
                    'Computer Studies/ICT',
                    'Agriculture/Home Economics'
                ]
            }
        ];
    }

    // Junior Secondary
    if (grade >= 9 && grade <= 11) {
        return [
            {
                category: 'Core Compulsory',
                subjects: [
                    'English Language',
                    'Mathematics',
                    'Basic Science',
                    'Social Studies',
                    'Civic Education'
                ]
            },
            {
                category: 'Vocational/Technical',
                subjects: [
                    'Basic Technology',
                    'Agricultural Science',
                    'Home Economics',
                    'Business Studies'
                ]
            },
            {
                category: 'Arts & Languages',
                subjects: [
                    'Cultural & Creative Arts (CCA)',
                    'French Language',
                    'Nigerian Language',
                    'Music'
                ]
            },
            {
                category: 'Religion',
                subjects: [
                    'Christian Religious Studies (CRS)',
                    'Islamic Studies (IRS)'
                ]
            },
            {
                category: 'Digital',
                subjects: ['Computer Studies']
            }
        ];
    }

    // Senior Secondary
    if (grade >= 12 && grade <= 14) {
        const categories = [
            {
                category: 'Core Compulsory (All Tracks)',
                subjects: [
                    'English Language',
                    'General Mathematics',
                    'Civic Education',
                    'Data Processing',
                    'Biology'
                ]
            }
        ];

        if (department === 'Science') {
            categories.push({
                category: 'Science Track Electives',
                subjects: [
                    'Physics',
                    'Chemistry',
                    'Further Mathematics',
                    'Geography',
                    'Agricultural Science',
                    'Technical Drawing'
                ]
            });
        } else if (department === 'Arts') {
            categories.push({
                category: 'Arts Track Electives',
                subjects: [
                    'Literature-in-English',
                    'Government',
                    'History',
                    'Christian Religious Studies (CRS)',
                    'Islamic Studies (IRS)',
                    'Nigerian Language (Hausa/Igbo/Yoruba)',
                    'Fine Arts',
                    'Geography'
                ]
            });
        } else if (department === 'Commercial') {
            categories.push({
                category: 'Commercial Track Electives',
                subjects: [
                    'Financial Accounting',
                    'Commerce',
                    'Economics',
                    'Government',
                    'Marketing',
                    'Office Practice',
                    'Business Studies'
                ]
            });
        }

        return categories;
    }

    return [];
}

// Get trade subjects for SSS
export function getTradeSubjects(): string[] {
    return [
        'Catering Craft',
        'Marketing',
        'Dyeing/Bleaching',
        'Data Processing',
        'Office Practice',
        'Garment Making',
        'Auto Mechanics',
        'Electrical Installation',
        'Building Construction',
        'Metal Work',
        'Wood Work',
        'Printing',
        'Cosmetology'
    ];
}

// Grade mapping constants
export const GRADE_LEVELS = {
    PRE_NURSERY: 0,
    NURSERY_1: 1,
    NURSERY_2: 2,
    BASIC_1: 3,
    BASIC_2: 4,
    BASIC_3: 5,
    BASIC_4: 6,
    BASIC_5: 7,
    BASIC_6: 8,
    JSS_1: 9,
    JSS_2: 10,
    JSS_3: 11,
    SSS_1: 12,
    SSS_2: 13,
    SSS_3: 14,
} as const;

// School level categories
export const SCHOOL_LEVELS = {
    EARLY_YEARS: 'Early Years',
    PRIMARY: 'Primary',
    JUNIOR_SECONDARY: 'Junior Secondary',
    SENIOR_SECONDARY: 'Senior Secondary',
} as const;

// Departments for Senior Secondary
export const SSS_DEPARTMENTS = {
    SCIENCE: 'Science',
    ARTS: 'Arts',
    COMMERCIAL: 'Commercial',
} as const;

// Subject categories
export const SUBJECT_CATEGORIES = {
    CORE: 'Core Compulsory',
    VOCATIONAL: 'Vocational/Technical',
    ARTS_LANGUAGES: 'Arts & Languages',
    RELIGION: 'Religion',
    DIGITAL: 'Digital',
    TRADE: 'Trade Subjects',
    ELECTIVES: 'Electives'
} as const;
