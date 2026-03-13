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

export const useTeacherClasses = (teacherId?: string | null, branchId?: string | null) => {
    const { profile } = useProfile();
    const { user: authUser } = useAuth();

    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

    const [resolvedTeacherId, setResolvedTeacherId] = useState<string | null>(null);
    const [resolvedSchoolId, setResolvedSchoolId] = useState<string | null>(null);
    const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [version, setVersion] = useState(0);
    const forceUpdate = () => setVersion(v => v + 1);

    useEffect(() => {
        let channel: any = null;

        const fetchClassesAndSubjects = async () => {
            let currentTeacherId = teacherId;
            let currentSchoolId = profile?.schoolId || authUser?.app_metadata?.school_id || authUser?.user_metadata?.school_id;

            setLoading(true);

            try {
                const { api } = await import('../lib/api');

                // 1. Resolve Teacher ID if not provided
                if (!currentTeacherId) {
                    const targetEmail = (profile?.email || authUser?.email || '').toLowerCase();
                    const targetUserId = profile?.id || authUser?.id;

                    if (targetUserId || targetEmail) {
                        // Check for both current ID and potential demo unified IDs
                        const demoTeacherIds = [
                            'd3300000-0000-0000-0000-000000000002',
                            'e7c92f78-3f44-435b-9079-6d77faae023e',
                            '6f90901e-4119-457d-8d73-745b17831a30'
                        ];
                        const { data: teacherRows } = await supabase
                            .from('teachers')
                            .select('id, school_id, email')
                            .or(`user_id.eq.${targetUserId},email.ilike.${targetEmail},id.eq.${targetUserId},id.in.(${demoTeacherIds.join(',')})`);

                        if (teacherRows && teacherRows.length > 0) {
                            // Prioritize exact email match if multiple records exist (common in demo mode)
                            const matched = teacherRows.find(t =>
                                t.school_id === currentSchoolId &&
                                (t.email?.toLowerCase() === targetEmail)
                            ) || teacherRows.find(t => t.school_id === currentSchoolId) || teacherRows[0];

                            currentTeacherId = matched.id;
                            currentSchoolId = matched.school_id;
                        }
                    }
                }

                if (!currentTeacherId) {
                    setLoading(false);
                    return;
                }

                setResolvedTeacherId(currentTeacherId);
                setResolvedSchoolId(currentSchoolId);

                // 2. Fetch Detailed Data via Hybrid API (handles Demo Mode backend fallback)
                const teacherData = await api.getTeacherById(currentTeacherId);

                if (teacherData) {
                    const finalClasses: ClassInfo[] = [];
                    const finalSubjects: Subject[] = [];
                    const finalAssignments: TeacherAssignment[] = [];
                    const addedClassKeys = new Set<string>();
                    const addedSubjectKeys = new Set<string>();

                    // 1. Process Modern class_teachers (Detailed)
                    if (teacherData.class_teachers && Array.isArray(teacherData.class_teachers)) {
                        teacherData.class_teachers.forEach((item: any) => {
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

                    // 2. Process Legacy teacher_classes (Fallback)
                    if (teacherData.teacher_classes && Array.isArray(teacherData.teacher_classes)) {
                        teacherData.teacher_classes.forEach((tc: any) => {
                            const name = tc.class_name || tc.name;
                            if (name && !Array.from(addedClassKeys).some(k => k.split('-')[0] === name || k.includes(name))) {
                                const { grade, section } = parseClassName(name);
                                finalClasses.push({
                                    id: name,
                                    name: name,
                                    grade,
                                    section,
                                    subject: 'General',
                                    studentCount: 0,
                                    schoolId: currentSchoolId || ''
                                });
                                addedClassKeys.add(`${name}-general`);
                            }
                        });
                    }

                    // 3. Process Legacy teacher_subjects (Fallback)
                    if (teacherData.teacher_subjects && Array.isArray(teacherData.teacher_subjects)) {
                        teacherData.teacher_subjects.forEach((ts: any) => {
                            const name = ts.subject || ts.name;
                            if (name && !Array.from(addedSubjectKeys).some(id => id === name)) {
                                finalSubjects.push({ id: name, name });
                                addedSubjectKeys.add(name);
                            }
                        });
                    }

                    setClasses(deduplicateClasses(finalClasses));
                    setSubjects(finalSubjects);
                    setAssignments(finalAssignments);
                }

                if (!channel) {
                    channel = supabase
                        .channel(`teacher-assignments-${currentTeacherId}`)
                        // Listen to modern class_teachers
                        .on('postgres_changes', {
                            event: '*',
                            schema: 'public',
                            table: 'class_teachers',
                            filter: `teacher_id=eq.${currentTeacherId}`
                        }, (payload) => {
                            console.log('🔄 [useTeacherClasses] class_teachers change detected:', payload.eventType);
                            forceUpdate();
                        })
                        // Listen to legacy teacher_classes
                        .on('postgres_changes', {
                            event: '*',
                            schema: 'public',
                            table: 'teacher_classes',
                            filter: `teacher_id=eq.${currentTeacherId}`
                        }, () => forceUpdate())
                        // Listen to legacy teacher_subjects
                        .on('postgres_changes', {
                            event: '*',
                            schema: 'public',
                            table: 'teacher_subjects',
                            filter: `teacher_id=eq.${currentTeacherId}`
                        }, () => forceUpdate())
                        .subscribe();
                }

            } catch (err) {
                console.error('❌ [useTeacherClasses] Error:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClassesAndSubjects();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [profile?.email, profile?.id, profile?.schoolId, authUser?.email, authUser?.id, teacherId, version]);

    return { classes, subjects, assignments, loading, error, teacherId: resolvedTeacherId, schoolId: resolvedSchoolId };
};
