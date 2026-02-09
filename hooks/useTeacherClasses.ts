import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { getFormattedClassName } from '../constants';

import { ClassInfo } from '../types';

export const useTeacherClasses = (teacherId?: string | null) => {
    const { profile } = useProfile();
    const { user } = useAuth();
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const fetchClasses = async () => {
            // ... (Teacher ID resolution remains same) ...
            // Simplified Teacher ID Resolution for brevity in this replace block, 
            // but assuming we keep the existing logic, I will focus on the MATCHING part below.

            let resolvedTeacherId = teacherId || profile?.id; // simplified local var for context
            if (!resolvedTeacherId && (profile?.email || user?.email)) {
                // Quick fetch by email if ID missing
                const { data } = await supabase.from('teachers').select('id').eq('email', profile?.email || user?.email).maybeSingle();
                if (data) resolvedTeacherId = data.id;
            }

            if (!resolvedTeacherId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // 2. Fetch Assignments
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
                    .order('grade', { ascending: true });

                if (classesError) throw classesError;


                const finalClasses: ClassInfo[] = [];
                const addedKeys = new Set<string>();

                // Helper to normalize strings: remove spaces, lowercase
                const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

                (classesData || []).forEach((c: any) => {
                    // DB Class Name construction suggestion
                    const dbName1 = `Grade ${c.grade} ${c.section || ''}`.trim();
                    const dbName2 = `Primary ${c.grade} ${c.section || ''}`.trim();
                    const dbName3 = (c.grade >= 7 && c.grade <= 9) ? `JSS ${c.grade - 6} ${c.section || ''}`.trim() : `JSS ${c.grade} ${c.section || ''}`.trim();
                    const dbName4 = (c.grade >= 10 && c.grade <= 12) ? `SSS ${c.grade - 9} ${c.section || ''}`.trim() : `SSS ${c.grade} ${c.section || ''}`.trim();

                    // Strict matching to prevent "Grade 10" matching "Grade 1"
                    const isMatch = assignedClassNames.some(assignedName => {
                        const normAssigned = normalize(assignedName);
                        // Check for exact matches against normalized variants
                        return normAssigned === normalize(dbName1) ||
                            normAssigned === normalize(dbName2) ||
                            normAssigned === normalize(dbName3) ||
                            normAssigned === normalize(dbName4) ||
                            normAssigned === `${c.grade}${normalize(c.section || '')}`;
                    });

                    if (isMatch) {
                        const key = `${c.grade}-${c.section}`;
                        if (!addedKeys.has(key)) {
                            finalClasses.push({
                                id: c.id,
                                grade: c.grade,
                                section: c.section,
                                subject: 'General', // We can improve subject extraction later if needed
                                studentCount: 0,
                                schoolId: c.school_id
                            });
                            addedKeys.add(key);
                        }
                    }
                });

                setClasses(finalClasses);

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
