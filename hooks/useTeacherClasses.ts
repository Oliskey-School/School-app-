import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { ClassInfo, Subject } from '../types';
import { parseClassName, deduplicateClasses } from '../utils/classUtils';

export interface TeacherAssignment {
    classId: string;
    subjectId: string;
}

export const useTeacherClasses = (teacherId?: string | null) => {
    const { profile } = useProfile();
    const { user: authUser } = useAuth();

    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [version, setVersion] = useState(0);
    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        let channel: any = null;

        const fetchClassesAndSubjects = async () => {
            let resolvedTeacherId = null;
            let resolvedSchoolId = null;

            setLoading(true);

            try {
                // 1. Resolve Teacher ID
                if (teacherId && teacherId.length > 30) {
                    console.log('🔍 [useTeacherClasses] Resolving provided teacherId:', teacherId);
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

                if (!resolvedTeacherId) {
                    const targetEmail = (profile?.email || authUser?.email || '').toLowerCase();
                    const targetUserId = profile?.id || authUser?.id;
                    const metadataSchoolId = authUser?.app_metadata?.school_id || authUser?.user_metadata?.school_id;
                    const contextSchoolId = profile?.schoolId || metadataSchoolId;

                    console.log('🔍 [useTeacherClasses] Resolving from context:', {
                        targetEmail,
                        targetUserId,
                        contextSchoolId
                    });

                    if (targetUserId || targetEmail) {
                        const { data: teacherRows } = await supabase
                            .from('teachers')
                            .select('id, school_id, email')
                            .or(`user_id.eq.${targetUserId},email.ilike.${targetEmail}`);

                        if (teacherRows && teacherRows.length > 0) {
                            const schoolMatch = teacherRows.find(t => t.school_id === contextSchoolId);
                            const matched = schoolMatch || teacherRows[0];
                            resolvedTeacherId = matched.id;
                            resolvedSchoolId = matched.school_id;
                            console.log('✅ [useTeacherClasses] Resolved teacher identity:', {
                                resolvedTeacherId,
                                resolvedSchoolId,
                                isContextMatch: !!schoolMatch
                            });
                        }
                    }
                }

                if (!resolvedTeacherId) {
                    console.warn('⚠️ [useTeacherClasses] Could not resolve teacher identity.');
                    setLoading(false);
                    return;
                }

                console.log('✅ [useTeacherClasses] Resolved Teacher:', resolvedTeacherId, 'School:', resolvedSchoolId);

                if (!channel) {
                    channel = supabase
                        .channel(`teacher-classes-${resolvedTeacherId}`)
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
                }

                setLoading(true);

                const finalClasses: ClassInfo[] = [];
                const finalSubjects: Subject[] = [];
                const finalAssignments: TeacherAssignment[] = [];

                const addedClassKeys = new Set<string>();
                const addedSubjectKeys = new Set<string>();

                // 1. Fetch Assignments via class_teachers (modern table)
                const { data: modernData, error: assignmentError } = await supabase
                    .from('class_teachers')
                    .select(`
                        class_id,
                        subject_id,
                        classes (id, name, grade, section, school_id),
                        subjects (id, name)
                    `)
                    .eq('teacher_id', resolvedTeacherId);

                if (assignmentError) throw assignmentError;

                if (modernData && modernData.length > 0) {
                    modernData.forEach((item: any) => {
                        const c = item.classes;
                        const s = item.subjects;

                        if (c) {
                            const key = `${c.id}-${item.subject_id || 'general'}`;
                            if (!addedClassKeys.has(key)) {
                                finalClasses.push({
                                    id: c.id,
                                    name: c.name,
                                    grade: c.grade,
                                    section: c.section || '',
                                    subject: s?.name || 'General',
                                    studentCount: 0,
                                    schoolId: c.school_id
                                });
                                addedClassKeys.add(key);
                            }
                        }

                        if (s) {
                            if (!addedSubjectKeys.has(s.id)) {
                                finalSubjects.push({ id: s.id, name: s.name });
                                addedSubjectKeys.add(s.id);
                            }
                        }

                        if (c && s) {
                            finalAssignments.push({ classId: c.id, subjectId: s.id });
                        }
                    });
                }

                // 2. Fallback for Legacy Data (if missing classes or subjects)
                // Determine school context for data fetching
                const metadataSchoolId = authUser?.app_metadata?.school_id || authUser?.user_metadata?.school_id;
                const targetSchoolId = resolvedSchoolId || profile?.schoolId || metadataSchoolId;

                console.log('📊 [useTeacherClasses] Fetching data for school:', targetSchoolId);

                if (finalClasses.length === 0 || finalSubjects.length === 0) {
                    console.log('ℹ️ [useTeacherClasses] Modern data incomplete, checking legacy...');

                    // Class Fallback
                    if (finalClasses.length === 0 && targetSchoolId) {
                        const { data: legacyClasses } = await supabase
                            .from('teacher_classes')
                            .select('class_name')
                            .eq('teacher_id', resolvedTeacherId);

                        if (legacyClasses && legacyClasses.length > 0) {
                            const { data: allClasses } = await supabase
                                .from('classes')
                                .select('id, name, grade, section, school_id')
                                .eq('school_id', targetSchoolId);

                            if (allClasses) {
                                const normalize = (s: string) => s.replace(/Grade|Year|JSS|SSS|SS|Primary|Basic|\s/gi, '').toUpperCase();
                                legacyClasses.forEach((legacy: any) => {
                                    if (!legacy.class_name) return;
                                    const parsed = parseClassName(legacy.class_name);

                                    const matches = allClasses.filter(c => {
                                        if (c.grade === parsed.grade && parsed.grade !== 0) {
                                            if (parsed.section) return normalize(c.section || '') === normalize(parsed.section);
                                            return true;
                                        }
                                        return normalize(legacy.class_name).includes(normalize(`${c.grade}${c.section || ''}`));
                                    });

                                    matches.forEach(match => {
                                        const key = `${match.id}-general`;
                                        if (!addedClassKeys.has(key)) {
                                            finalClasses.push({
                                                id: match.id,
                                                name: match.name,
                                                grade: match.grade,
                                                section: match.section || '',
                                                subject: 'General',
                                                studentCount: 0,
                                                schoolId: match.school_id
                                            });
                                            addedClassKeys.add(key);
                                        }
                                    });
                                });
                            }
                        }
                    }

                    // Subject Fallback
                    if (finalSubjects.length === 0 && targetSchoolId) {
                        const { data: legacySubjects } = await supabase
                            .from('teacher_subjects')
                            .select('subject')
                            .eq('teacher_id', resolvedTeacherId);

                        if (legacySubjects && legacySubjects.length > 0) {
                            const { data: schoolSubjects } = await supabase
                                .from('subjects')
                                .select('id, name')
                                .eq('school_id', targetSchoolId);

                            if (schoolSubjects) {
                                const normalize = (s: string) => s.toLowerCase().replace(/\s/g, '');
                                legacySubjects.forEach((legacy: any) => {
                                    if (!legacy.subject) return;
                                    const match = schoolSubjects.find(s => normalize(s.name) === normalize(legacy.subject));
                                    if (match && !addedSubjectKeys.has(match.id)) {
                                        finalSubjects.push({ id: match.id, name: match.name });
                                        addedSubjectKeys.add(match.id);
                                    }
                                });
                            }
                        }
                    }
                }

                setClasses(deduplicateClasses(finalClasses));
                setSubjects(finalSubjects);
                setAssignments(finalAssignments);

            } catch (err) {
                console.error('❌ [useTeacherClasses] Error:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClassesAndSubjects();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [profile?.email, profile?.id, profile?.schoolId, authUser?.email, authUser?.id, teacherId, version]);

    return { classes, subjects, assignments, loading, error };
};
