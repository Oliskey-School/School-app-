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
                    const addedClassKeys = new Set<string>();
                    const addedSubjectKeys = new Set<string>();

                    // Process classes and assignments from teacherData
                    // My updated Service returns teacher.classes which is ClassTeacher[]
                    if (teacherData.classes && Array.isArray(teacherData.classes)) {
                        teacherData.classes.forEach((item: any) => {
                            const c = item.class;
                            const subjectName = item.subject || 'General'; // Current schema might not have subject on ClassTeacher yet, but let's be safe

                            if (c) {
                                const key = `${c.id}`;
                                if (!addedClassKeys.has(key)) {
                                    finalClasses.push({
                                        id: c.id,
                                        name: c.name,
                                        grade: c.grade,
                                        section: c.section || '',
                                        subject: subjectName,
                                        studentCount: c.student_count || 0,
                                        schoolId: c.school_id
                                    });
                                    addedClassKeys.add(key);
                                }
                                
                                // Mapping subjects if they exist - For now we use some defaults or the ones from the class
                                // In a real app, ClassTeacher would have a subject_id or the teacher has a subjects list
                            }
                        });
                    }

                    setClasses(deduplicateClasses(finalClasses));
                    // Subjects might come from a different endpoint or the teacher profile could be expanded
                    // For demo, we'll extract from classes or use the teacher's subject specialty
                    if (teacherData.subject_specialty) {
                        setSubjects([{ id: 'specialty', name: teacherData.subject_specialty }]);
                    }
                    
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
