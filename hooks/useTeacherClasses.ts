import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { getFormattedClassName } from '../constants';

export interface ClassInfo {
    id: string;
    grade: number;
    section: string;
    subject: string;
    studentCount?: number;
}

export const useTeacherClasses = (teacherId?: number | null) => {
    const { profile } = useProfile();
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const fetchClasses = async () => {
            let resolvedTeacherId: number | null = null;

            // 1. Determine Teacher ID
            if (teacherId) {
                resolvedTeacherId = teacherId;
            } else if (profile?.email) {
                // Try fetching by email if no ID provided
                try {
                    const { data: teacherData, error: teacherError } = await supabase
                        .from('teachers')
                        .select('id')
                        .eq('email', profile.email)
                        .single();

                    if (teacherData) {
                        resolvedTeacherId = teacherData.id;
                    } else if (teacherError) {
                        console.error('Error fetching teacher profile by email:', teacherError);
                    }
                } catch (err) {
                    console.error('Error in teacher lookup:', err);
                }
            }

            if (!resolvedTeacherId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // 2. Fetch Assignments using the resolved ID
                const { data: assignments, error: assignmentError } = await supabase
                    .from('teacher_classes')
                    .select('class_name, id')
                    .eq('teacher_id', resolvedTeacherId);

                if (assignmentError) throw assignmentError;
                const assignedClassNames = assignments?.map(a => a.class_name) || [];

                // 3. Fetch ALL classes
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select('*')
                    .order('grade', { ascending: true })
                    .order('section', { ascending: true });

                if (classesError) throw classesError;

                // 4. Robust Matching & Parsing Logic
                const parseAssignment = (name: string) => {
                    // E.g. "Grade 10 - Mathematics" -> "10", "Mathematics"
                    const nameWithoutPrefix = name.replace(/^Grade\s+/i, '');
                    const parts = nameWithoutPrefix.split(/\s*[-–]\s*/);

                    const cleanClass = parts[0].trim();
                    const assignedSubject = parts.length > 1 ? parts[1].trim() : null;

                    const match = cleanClass.match(/^(\d+)([A-Za-z])?$/);
                    let result = {
                        type: 'string',
                        raw: name.toLowerCase(),
                        subject: assignedSubject,
                        grade: 0,
                        section: null as string | null
                    };

                    if (match) {
                        result.type = 'numeric';
                        result.grade = parseInt(match[1]);
                        result.section = match[2] || null;
                    }
                    return result;
                };

                const parsedAssignments = assignedClassNames.map(parseAssignment);
                const finalClasses: ClassInfo[] = [];
                const addedKeys = new Set<string>();

                (classesData || []).forEach((c: any) => {
                    // STRICT FILTER: Skip if section is missing or empty
                    if (!c.section || c.section.trim() === '') return;

                    const fname = getFormattedClassName(c.grade, c.section);
                    const key = `${c.grade}-${c.section}`;

                    // DEDUPLICATION: Skip if already added
                    if (addedKeys.has(key)) return;

                    const fnameLower = fname.toLowerCase();

                    const matchedAssignment = parsedAssignments.find(assignment => {
                        if (assignment.type === 'numeric') {
                            if (assignment.grade === c.grade) {
                                if (assignment.section) {
                                    return assignment.section.toLowerCase() === c.section.toLowerCase();
                                }
                                return true;
                            }
                            return false;
                        } else {
                            // Fuzzy matching
                            return assignment.raw.includes(fnameLower) ||
                                fnameLower.includes(assignment.raw) ||
                                assignment.raw.includes(`grade ${c.grade}`) ||
                                assignment.raw.includes(`${c.grade}${c.section.toLowerCase()}`);
                        }
                    });

                    if (matchedAssignment) {
                        finalClasses.push({
                            id: c.id,
                            grade: c.grade,
                            section: c.section,
                            // Override subject if avail from assignment
                            subject: matchedAssignment.subject || c.subject || 'General',
                            studentCount: 0
                        });
                        addedKeys.add(key);
                    }
                });

                // Sort
                setClasses(finalClasses.sort((a, b) => {
                    if (a.grade !== b.grade) return a.grade - b.grade;
                    return a.section.localeCompare(b.section);
                }));

            } catch (err) {
                console.error('Error fetching teacher classes:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, [profile?.email, teacherId]);

    return { classes, loading, error };
};
