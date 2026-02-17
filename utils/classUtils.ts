export interface ClassOption {
    id: string;
    name?: string;
    grade: number;
    section?: string;
    [key: string]: any; // Allow other properties
}

/**
 * Parses a class name string to extract grade and section.
 * Supports patterns like "Grade 10A", "JSS 1A", "Primary 4 B", "10 A".
 */
export const parseClassName = (name: string) => {
    const clean = name.trim();
    let grade = 0;
    let section = '';

    // 1. Try Standard Patterns
    // Matches: "10A", "10 A", "Grade 10A", "Year 10A"
    const standardMatch = clean.match(/^(?:Grade|Year)?\s*(\d+)\s*(.*)$/i);

    // 2. Try Nigerian Secondary Patterns
    // Matches: "JSS 1A", "JSS1 A", "SSS 3 Gold"
    const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
    const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i); // Matches SS or SSS

    // 3. Try Primary Patterns
    const primaryMatch = clean.match(/^Primary\s*(\d+)\s*(.*)$/i);

    if (standardMatch) {
        grade = parseInt(standardMatch[1]);
        section = standardMatch[2];
    } else if (jsMatch) {
        grade = 6 + parseInt(jsMatch[1]); // JSS1 = 7
        section = jsMatch[2];
    } else if (ssMatch) {
        grade = 9 + parseInt(ssMatch[1]); // SS1 = 10
        section = ssMatch[2];
    } else if (primaryMatch) {
        grade = parseInt(primaryMatch[1]);
        section = primaryMatch[2];
    }

    // Clean section (remove hyphens, extra spaces)
    section = section.replace(/^[-–]\s*/, '').trim();

    return { grade, section };
};

/**
 * Generates a unique key for a class based on its grade and section.
 * Classes with the same grade and normalized section will have the same key.
 */
export const getUniqueClassKey = (cls: ClassOption): string => {
    const section = (cls.section || '').trim().toUpperCase();
    return `${cls.grade}-${section}`;
};

/**
 * Deduplicates an array of classes based on Grade and Section.
 * Prioritizes keeping the first occurrence.
 */
export const deduplicateClasses = <T extends ClassOption>(classes: T[]): T[] => {
    const seen = new Set<string>();
    const uniqueClasses: T[] = [];

    for (const cls of classes) {
        const key = getUniqueClassKey(cls);
        if (!seen.has(key)) {
            seen.add(key);
            uniqueClasses.push(cls);
        }
    }

    return uniqueClasses;
};
