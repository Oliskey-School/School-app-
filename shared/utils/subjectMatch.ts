/**
 * Subject names are free text and come from more than one place: the school's
 * subject catalogue ("Mathematics"), a teacher's assignment ("Mathematics"),
 * and an admin-typed per-student list ("General Mathematics", "ICT"). Exact
 * string equality between those silently hid work from students — a student
 * whose list said "General Mathematics" saw no "Mathematics" assignments at
 * all. Compare leniently: case/punctuation-insensitive, and one name may
 * contain the other ("ict" ⊂ "computer studies/ict").
 */
export function normalizeSubjectName(name: unknown): string {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function subjectNamesMatch(a: unknown, b: unknown): boolean {
    const x = normalizeSubjectName(a), y = normalizeSubjectName(b);
    if (!x || !y) return false;
    if (x === y) return true;
    // whole-word containment either way
    return ` ${x} `.includes(` ${y} `) || ` ${y} `.includes(` ${x} `);
}

/** True when `subject` is covered by a (possibly empty = "all") list of subject names. */
export function subjectAllowed(subject: unknown, allowed: unknown[] | null | undefined): boolean {
    const list = (allowed || []).filter(Boolean);
    if (list.length === 0) return true;
    return list.some(s => subjectNamesMatch(s, subject));
}
