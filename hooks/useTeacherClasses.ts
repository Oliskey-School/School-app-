import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { getFormattedClassName } from '../constants';

export interface ClassInfo {
    id: string;
    grade: number;
    section: string;
    subject: string;
    studentCount?: number;
}

export const useTeacherClasses = (teacherId?: string | null) => {
    const { profile } = useProfile();
    const { user } = useAuth();
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const fetchClasses = async () => {
            let resolvedTeacherId: string | null = null;

            console.log('🔍 [useTeacherClasses] Starting fetch with:', {
                providedTeacherId: teacherId,
                profileId: profile?.id,
                profileEmail: profile?.email,
                userEmail: user?.email
            });

            // 1. Determine Teacher ID - Multiple fallback strategies
            if (teacherId) {
                resolvedTeacherId = teacherId;
                console.log('✅ Using provided teacherId:', resolvedTeacherId);
            } else if (profile?.id) {
                // Try using profile ID directly if it exists
                resolvedTeacherId = profile.id;
                console.log('✅ Using profile.id:', resolvedTeacherId);
            } else {
                // Fallback: fetch teacher by email
                const emailToQuery = profile?.email || user?.email;

                if (!emailToQuery) {
                    console.warn('⚠️ No email available to query teacher profile');
                    setLoading(false);
                    return;
                }

                console.log('🔍 Fetching teacher by email:', emailToQuery);

                try {
                    const { data: teacherData, error: teacherError } = await supabase
                        .from('teachers')
                        .select('id, name, email')
                        .eq('email', emailToQuery)
                        .maybeSingle();

                    if (teacherError) {
                        console.error('❌ Error fetching teacher profile by email:', teacherError);
                        setError(teacherError);
                        setLoading(false);
                        return;
                    }

                    if (teacherData) {
                        resolvedTeacherId = teacherData.id;
                        console.log('✅ Found teacher by email:', { id: resolvedTeacherId, name: teacherData.name });
                    } else {
                        console.warn('⚠️ No teacher profile found for email:', emailToQuery);
                    }
                } catch (err) {
                    console.error('❌ Error in teacher lookup:', err);
                    setError(err);
                    setLoading(false);
                    return;
                }
            }

            if (!resolvedTeacherId) {
                console.warn('⚠️ Could not resolve teacher ID');
                setLoading(false);
                return;
            }

            console.log('🔍 Fetching classes for teacher ID:', resolvedTeacherId);
            setLoading(true);
            try {
                // 2. Fetch Assignments using the resolved ID
                const { data: assignments, error: assignmentError } = await supabase
                    .from('teacher_classes')
                    .select('class_name, id')
                    .eq('teacher_id', resolvedTeacherId);

                if (assignmentError) {
                    console.error('❌ Error fetching assignments:', assignmentError);
                    throw assignmentError;
                }

                console.log('📋 Found assignments:', assignments);
                const assignedClassNames = assignments?.map(a => a.class_name) || [];

                // 3. Fetch ALL classes
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select('*')
                    .order('grade', { ascending: true })
                    .order('section', { ascending: true });

                if (classesError) {
                    console.error('❌ Error fetching classes:', classesError);
                    throw classesError;
                }

                console.log('📚 All classes from DB:', classesData);

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
                console.log('🔍 Parsed assignments:', parsedAssignments);

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

                console.log('✅ Final matched classes:', finalClasses);

                // Sort
                setClasses(finalClasses.sort((a, b) => {
                    if (a.grade !== b.grade) return a.grade - b.grade;
                    return a.section.localeCompare(b.section);
                }));

            } catch (err) {
                console.error('❌ Error fetching teacher classes:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, [profile?.email, profile?.id, user?.email, teacherId]);

    return { classes, loading, error };
};
