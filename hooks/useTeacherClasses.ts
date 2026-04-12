import { useState, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { ClassInfo, Subject } from '../types';
import { parseClassName, deduplicateClasses } from '../utils/classUtils';
import { useAutoSync } from './useAutoSync';

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
        const fetchClassesAndSubjects = async () => {
            let currentTeacherId = teacherId;
            let currentSchoolId = profile?.schoolId || authUser?.app_metadata?.school_id || authUser?.user_metadata?.school_id;

            setLoading(true);

            try {
                const { api } = await import('../lib/api');

                // 1. Resolve Teacher ID if not provided using authorized backend call
                if (!currentTeacherId) {
                    const teacherProfile = await api.getMyTeacherProfile().catch(() => null);
                    if (teacherProfile) {
                        currentTeacherId = teacherProfile.id;
                        currentSchoolId = teacherProfile.school_id;
                    }
                }

                if (!currentTeacherId) {
                    setLoading(false);
                    return;
                }

                setResolvedTeacherId(currentTeacherId);
                setResolvedSchoolId(currentSchoolId);

                // 2. Fetch Detailed Data via API
                const teacherData = await api.getMyTeacherProfile();

                if (teacherData) {
                    const finalClasses: ClassInfo[] = [];
                    const finalSubjects: Subject[] = [];
                    const finalAssignments: TeacherAssignment[] = [];
                    const addedClassIds = new Set<string>();
                    const addedSubjectIds = new Set<string>();

                    if (teacherData.classes && Array.isArray(teacherData.classes)) {
                        teacherData.classes.forEach((item: any) => {
                            const c = item.class;
                            const s = item.subject;

                            if (c) {
                                // Add to classes list if not already there OR if it's a different subject assignment
                                // Note: For the UI dropdown, we might want unique classes, but for specific assignments, 
                                // we need the subject context.
                                const classKey = `${c.id}-${s?.name || 'General'}`;
                                if (!addedClassIds.has(classKey)) {
                                    finalClasses.push({
                                        id: c.id,
                                        name: c.name,
                                        grade: c.grade,
                                        section: c.section || '',
                                        subject: s?.name || 'General',
                                        studentCount: c.student_count || 0,
                                        schoolId: c.school_id
                                    });
                                    addedClassIds.add(classKey);
                                }

                                if (s) {
                                    if (!addedSubjectIds.has(s.id)) {
                                        finalSubjects.push({
                                            id: s.id,
                                            name: s.name,
                                            code: s.code
                                        } as Subject);
                                        addedSubjectIds.add(s.id);
                                    }

                                    finalAssignments.push({
                                        classId: c.id,
                                        subjectId: s.id
                                    });
                                }
                            }
                        });
                    }

                    // Fallback if no specific subjects assigned, use subject_specialty if available
                    if (finalSubjects.length === 0 && teacherData.subject_specialty) {
                        const specialties = Array.isArray(teacherData.subject_specialty) 
                            ? teacherData.subject_specialty 
                            : [teacherData.subject_specialty];
                        
                        specialties.forEach((spec: string, idx: number) => {
                            const id = `specialty-${idx}`;
                            finalSubjects.push({ id, name: spec } as Subject);
                            
                            // Map this specialty to all assigned classes as a fallback
                            finalClasses.forEach(c => {
                                finalAssignments.push({ classId: c.id, subjectId: id });
                            });
                        });
                    }

                    setClasses(finalClasses);
                    setSubjects(finalSubjects);
                    setAssignments(finalAssignments);
                }

            } catch (err) {
                console.error('❌ [useTeacherClasses] Error:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClassesAndSubjects();
    }, [profile?.email, profile?.id, profile?.schoolId, authUser?.email, authUser?.id, teacherId, version]);

    useAutoSync(['class_teachers', 'teacher_classes', 'teacher_subjects'], () => {
        forceUpdate();
    });

    return { classes, subjects, assignments, loading, error, teacherId: resolvedTeacherId, schoolId: resolvedSchoolId };
};
