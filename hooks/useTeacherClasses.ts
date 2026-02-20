import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { getFormattedClassName } from '../constants';

import { ClassInfo } from '../types';
import { deduplicateClasses } from '../utils/classUtils';

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
        let channel: any = null;

        const fetchClasses = async () => {
            // 1. Resolve Teacher ID (Row ID, not Auth UID) & School ID
            let resolvedTeacherId = null;
            let resolvedSchoolId = null;

            // Step A: If an ID is provided, it might be the Row ID OR the Auth User ID
            if (teacherId) {
                const { data: teacherRow } = await supabase
                    .from('teachers')
                    .select('id, school_id')
                    .or(`id.eq.${teacherId},user_id.eq.${teacherId}`)
                    .maybeSingle();
                if (teacherRow) {
                    resolvedTeacherId = teacherRow.id;
                    resolvedSchoolId = teacherRow.school_id;
                }
            }

            // Step B: Fallback to context if still not resolved
            if (!resolvedTeacherId) {
                const { data: teacherRow } = await supabase
                    .from('teachers')
                    .select('id, school_id')
                    .or(`user_id.eq.${profile?.id || user?.id},email.eq.${profile?.email || user?.email}`)
                    .maybeSingle();

                if (teacherRow) {
                    resolvedTeacherId = teacherRow.id;
                    resolvedSchoolId = teacherRow.school_id;
                }
            }

            if (!resolvedTeacherId) {
                // console.warn('⚠️ Could not resolve teacher ID for classes hook');
                setLoading(false);
                return;
            }

            // Determine if we need to set up a subscription (only if one doesn't exist for this teacher)
            // Ideally, we subscribe once per resolvedTeacherId

            // REAL-TIME SUBSCRIPTION
            // We use a unique channel name to avoid collisions
            if (!channel) {
                channel = supabase
                    .channel(`teacher-classes-${resolvedTeacherId}-${Date.now()}`)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'class_teachers',
                        filter: `teacher_id=eq.${resolvedTeacherId}`
                    }, (payload) => {
                        console.log('Real-time update received (class_teachers):', payload);
                        forceUpdate();
                    })
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'teacher_classes',
                        filter: `teacher_id=eq.${resolvedTeacherId}`
                    }, (payload) => {
                        console.log('Real-time update received (teacher_classes):', payload);
                        forceUpdate();
                    })
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            // console.log('Subscribed to teacher class updates');
                        }
                    });
            }

            setLoading(true);

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
                        ),
                        subject_id,
                        subjects (
                            name
                        )
                    `)
                    .eq('teacher_id', resolvedTeacherId);

                if (assignmentError) throw assignmentError;

                const finalClasses: ClassInfo[] = [];
                const addedKeys = new Set<string>();

                (assignments || []).forEach((assignment: any) => {
                    const c = assignment.classes;
                    const s = assignment.subjects;
                    if (!c) return;

                    // Unique key includes subject to handle different subjects in same class
                    const key = `${c.id}-${assignment.subject_id || 'general'}`;
                    if (!addedKeys.has(key)) {
                        finalClasses.push({
                            id: c.id,
                            name: c.name, // Added name
                            grade: c.grade,
                            section: c.section || '',
                            subject: s?.name || 'General',
                            studentCount: 0,
                            schoolId: c.school_id
                        });
                        addedKeys.add(key);
                    }
                });

                console.log(`[useTeacherClasses] Resolved ${finalClasses.length} modern assignments for teacher ${resolvedTeacherId}`);

                // 3. Fetch assignments via teacher_classes (Legacy String based)
                const { data: legacyAssignments, error: legacyError } = await supabase
                    .from('teacher_classes')
                    .select('class_name')
                    .eq('teacher_id', resolvedTeacherId);

                if (legacyError) console.warn('Error fetching legacy classes:', legacyError);

                // 4. Resolve Legacy Classes
                if (legacyAssignments && legacyAssignments.length > 0) {
                    // Fetch all classes for this school to match against
                    // We need schoolId. Try resolvedSchoolId first, then profile.schoolId, then infer from existing classes
                    let targetSchoolId = resolvedSchoolId || profile?.schoolId;

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

                                // Strategy: Parse Grade/Section and match ALL corresponding classes
                                // e.g., "Assign: 4" should match "Primary 4", "Primary 4 A", "Primary 4 B"

                                const parsed = parseClassName(name);

                                const matches = allClasses.filter(c => {
                                    if (c.name === name) return true;

                                    // If legacy is just a number (e.g. "4"), match any class with that grade
                                    // But be careful not to mix JSS and Primary if the parser distinguishes them.
                                    // Our parser returns grade numbers: Primary 4 -> 4, JSS 1 -> 7.
                                    // So matching on 'grade' field is safe.

                                    if (c.grade === parsed.grade) {
                                        // If the legacy string specified a section (e.g. "4A"), only match that section.
                                        // If it didn't (e.g. "4"), match ALL sections.
                                        if (parsed.section) {
                                            return normalize(c.section || '') === normalize(parsed.section);
                                        }
                                        return true;
                                    }
                                    return false;
                                });

                                matches.forEach(match => {
                                    const key = `${match.id}`; // Simple key for legacy (no subject known)
                                    // Use a simpler key check for legacy to avoid duplicates with modern if class ID is same
                                    // But wait, key above was classId-subjectId.
                                    // If we have a modern assignment for Class X Subject Y, and legacy says "Class X",
                                    // Should we add it? Probably yes, as "General" or similar.
                                    // Let's stick to the existing logic but be careful.

                                    // Check if this class ID is already in finalClasses with 'General' subject
                                    const alreadyExists = finalClasses.some(fc => fc.id === match.id && fc.subject === 'General');

                                    if (!alreadyExists) {
                                        const legacyKey = `${match.id}-legacy`;
                                        if (!addedKeys.has(legacyKey)) {
                                            finalClasses.push({
                                                id: match.id,
                                                name: match.name,
                                                grade: match.grade,
                                                section: match.section || '',
                                                subject: 'General',
                                                studentCount: 0,
                                                schoolId: match.school_id
                                            });
                                            addedKeys.add(legacyKey);
                                        }
                                    }
                                });
                            });
                        }
                    }
                }

                // Deduplicate classes before setting state
                const uniqueClasses = deduplicateClasses(finalClasses);
                setClasses(uniqueClasses);

            } catch (err) {
                console.error('❌ Error fetching teacher classes:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();

        // Cleanup: Remove subscription when component unmounts or dependencies change
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [profile?.email, profile?.id, user?.email, teacherId, version]);

    return { classes, loading, error };
};
