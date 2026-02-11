import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { getFormattedClassName } from '../constants';

import { ClassInfo } from '../types';

const parseClassName = (name: string) => {
    const clean = name.trim();
    let grade = 0;
    let section = '';

    const standardMatch = clean.match(/^(?:Grade|Year)?\s*(\d+)\s*(.*)$/i);
    const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
    const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i);
    const primaryMatch = clean.match(/^Primary\s*(\d+)\s*(.*)$/i);

    if (standardMatch) {
        grade = parseInt(standardMatch[1]);
        section = standardMatch[2];
    } else if (jsMatch) {
        grade = 6 + parseInt(jsMatch[1]);
        section = jsMatch[2];
    } else if (ssMatch) {
        grade = 9 + parseInt(ssMatch[1]);
        section = ssMatch[2];
    } else if (primaryMatch) {
        grade = parseInt(primaryMatch[1]);
        section = primaryMatch[2];
    }

    section = section.replace(/^[-–]\s*/, '').trim();
    return { grade, section };
};

export const useTeacherClasses = (teacherId?: string | null) => {
    const { profile } = useProfile();
    const { user } = useAuth();
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [version, setVersion] = useState(0);
    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        const fetchClasses = async () => {
            // 1. Resolve Teacher ID (Row ID, not Auth UID)
            let resolvedTeacherId = null;

            // Step A: If an ID is provided, it might be the Row ID OR the Auth User ID
            if (teacherId) {
                const { data: teacherRow } = await supabase
                    .from('teachers')
                    .select('id')
                    .or(`id.eq.${teacherId},user_id.eq.${teacherId}`)
                    .maybeSingle();
                if (teacherRow) resolvedTeacherId = teacherRow.id;
            }

            // Step B: Fallback to context if still not resolved
            if (!resolvedTeacherId) {
                const { data: teacherRow } = await supabase
                    .from('teachers')
                    .select('id')
                    .or(`user_id.eq.${profile?.id || user?.id},email.eq.${profile?.email || user?.email}`)
                    .maybeSingle();

                if (teacherRow) resolvedTeacherId = teacherRow.id;
            }

            if (!resolvedTeacherId) {
                console.warn('⚠️ Could not resolve teacher ID for classes hook');
                setLoading(false);
                return;
            }

            setLoading(true);

            // REAL-TIME SUBSCRIPTION
            const channel = supabase
                .channel(`teacher - classes - ${resolvedTeacherId} `)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'class_teachers',
                    filter: `teacher_id=eq.${resolvedTeacherId}`
                }, () => forceUpdate())
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'teacher_classes',
                    filter: `teacher_id=eq.${resolvedTeacherId}`
                }, () => forceUpdate())
                .subscribe();

            try {
                // 2. Fetch Assignments via class_teachers (modern table)
                const { data: assignments, error: assignmentError } = await supabase
                    .from('class_teachers')
                    .select(`
                        class_id,
                        classes (
                            id,
                            name,
                            grade,
                            section,
                            school_id
                        )
                    `)
                    .eq('teacher_id', resolvedTeacherId);

                if (assignmentError) throw assignmentError;

                const finalClasses: ClassInfo[] = [];
                const addedKeys = new Set<string>();

                (assignments || []).forEach((assignment: any) => {
                    const c = assignment.classes;
                    if (!c) return;

                    const key = `${c.id} `; // Use ID as key for uniqueness
                    if (!addedKeys.has(key)) {
                        finalClasses.push({
                            id: c.id,
                            grade: c.grade,
                            section: c.section || '',
                            subject: 'General',
                            studentCount: 0,
                            schoolId: c.school_id
                        });
                        addedKeys.add(key);
                    }
                });

                // 3. Fetch assignments via teacher_classes (Legacy String based)
                const { data: legacyAssignments, error: legacyError } = await supabase
                    .from('teacher_classes')
                    .select('class_name')
                    .eq('teacher_id', resolvedTeacherId);

                if (legacyError) console.warn('Error fetching legacy classes:', legacyError);

                // 4. Resolve Legacy Classes
                if (legacyAssignments && legacyAssignments.length > 0) {
                    // Fetch all classes for this school to match against
                    // We need schoolId. Try profile.schoolId or infer from existing classes
                    let targetSchoolId = profile?.schoolId;

                    // If we don't have schoolId from profile, try to get it from the first resolved class
                    if (!targetSchoolId && finalClasses.length > 0) {
                        targetSchoolId = finalClasses[0].schoolId;
                    }

                    if (targetSchoolId) {
                        const { data: allClasses } = await supabase
                            .from('classes')
                            .select('id, name, grade, section, school_id')
                            .eq('school_id', targetSchoolId);

                        if (allClasses) {
                            const normalize = (s: string) => s.replace(/Grade|Year|JSS|SSS|SS|\s/gi, '').toUpperCase();

                            legacyAssignments.forEach((legacy: any) => {
                                const name = legacy.class_name;
                                if (!name) return;

                                // Try to find a match in allClasses
                                // Strategy 1: Exact string match on name (unlikely but possible)
                                // Strategy 2: Parse Grade/Section and match

                                const parsed = parseClassName(name); // Need to define this helper

                                const match = allClasses.find(c => {
                                    if (c.name === name) return true;
                                    if (c.grade === parsed.grade &&
                                        normalize(c.section || '') === normalize(parsed.section)) return true;
                                    return false;
                                });

                                if (match) {
                                    const key = `${match.id} `;
                                    if (!addedKeys.has(key)) {
                                        finalClasses.push({
                                            id: match.id,
                                            grade: match.grade,
                                            section: match.section || '',
                                            subject: 'General',
                                            studentCount: 0,
                                            schoolId: match.school_id
                                        });
                                        addedKeys.add(key);
                                    }
                                }
                            });
                        }
                    }
                }

                setClasses(finalClasses);

            } catch (err) {
                console.error('❌ Error fetching teacher classes:', err);
                setError(err);
            } finally {
                setLoading(false);
            }

            return () => {
                supabase.removeChannel(channel);
            };
        };

        fetchClasses();
    }, [profile?.email, profile?.id, user?.email, teacherId, version]);

    return { classes, loading, error };
};
