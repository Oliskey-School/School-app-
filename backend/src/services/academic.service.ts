import { supabase as supabaseAdmin } from '../config/supabase';

export class AcademicService {
    static async saveGrade(schoolId: string, branchId: string | undefined, studentId: string | number, subject: string, term: string, score: number, session: string) {
        // Teacher submitting a grade. Uses Admin privileges to bypass RLS.
        let query = supabaseAdmin
            .from('academic_performance')
            .select('id')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('subject', subject)
            .eq('term', term);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            const { data, error } = await supabaseAdmin
                .from('academic_performance')
                .update({ score, last_updated: new Date().toISOString() })
                .eq('id', existing.id)
                .eq('school_id', schoolId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const insertData: any = {
                school_id: schoolId,
                student_id: studentId,
                subject,
                term,
                score,
                session,
                last_updated: new Date().toISOString()
            };
            if (branchId && branchId !== 'all') {
                insertData.branch_id = branchId;
            }

            const { data, error } = await supabaseAdmin
                .from('academic_performance')
                .insert([insertData])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    }

    static async getGrades(schoolId: string, branchId: string | undefined, studentIds: (string | number)[], subject: string, term: string) {
        if (!studentIds || studentIds.length === 0) return [];

        let query = supabaseAdmin
            .from('academic_performance')
            .select('student_id, score')
            .eq('school_id', schoolId)
            .eq('subject', subject)
            .eq('term', term)
            .in('student_id', studentIds);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;
        return data;
    }

    static async getSubjects(schoolId: string, branchId: string | undefined) {
        // Fetch subjects. Note: subjects table might not have branch_id, so we filter by school_id
        let query = supabaseAdmin
            .from('subjects')
            .select('*')
            .eq('school_id', schoolId)
            .order('name', { ascending: true });

        // If branch_id exists in schema, we could filter here, but previous error showed it doesn't.
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async getAnalytics(schoolId: string, branchId: string | undefined, selectedTerm: string, selectedClass: number | null) {
        // Fetch all academic performance records for the school/branch
        let query = supabaseAdmin
            .from('academic_performance')
            .select('*, students(id, name, current_class_id, classes(name))')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        if (selectedTerm && selectedTerm !== 'current' && selectedTerm !== 'all') {
            query = query.eq('term', selectedTerm);
        }

        if (selectedClass) {
            query = query.eq('class_id', selectedClass);
        }

        const { data, error } = await query;
        if (error) throw error;

        // DEMO MOCK
        if (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' && (!data || data.length === 0)) {
            return {
                gradeDistribution: [
                    { grade: 'A', count: 45, percentage: 35 },
                    { grade: 'B', count: 38, percentage: 30 },
                    { grade: 'C', count: 25, percentage: 20 },
                    { grade: 'D', count: 12, percentage: 10 },
                    { grade: 'F', count: 5, percentage: 5 }
                ],
                subjectPerformance: [
                    { subject: 'Mathematics', averageScore: 82, passRate: 88, totalStudents: 120 },
                    { subject: 'English', averageScore: 78, passRate: 92, totalStudents: 125 },
                    { subject: 'Physics', averageScore: 65, passRate: 75, totalStudents: 80 }
                ],
                classComparison: [
                    { className: 'Grade 10A', averageGPA: 3.5, passRate: 95, studentCount: 32 },
                    { className: 'Grade 10B', averageGPA: 3.2, passRate: 88, studentCount: 30 },
                    { className: 'Grade 9A', averageGPA: 3.1, passRate: 85, studentCount: 35 }
                ],
                metrics: {
                    overallGPA: 3.2,
                    passRate: 88.5,
                    topPerformer: 'Demo Student Alpha',
                    improvement: 4.5
                }
            };
        }

        if (!data || data.length === 0) {
            return {
                gradeDistribution: [],
                subjectPerformance: [],
                classComparison: [],
                metrics: { overallGPA: 0, passRate: 0, topPerformer: 'N/A', improvement: 0 }
            };
        }

        // Aggregate Real Data
        const gradeMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
        const subjectMap: Record<string, { total: number, scores: number[], passed: number }> = {};
        const classMap: Record<string, { total: number, scores: number[], passed: number }> = {};
        let totalScore = 0;
        let totalPassed = 0;

        data.forEach((item: any) => {
            // Grade Distribution
            const grade = (item.grade || 'F').toUpperCase();
            if (gradeMap[grade] !== undefined) gradeMap[grade]++;

            // Metrics
            totalScore += item.score || 0;
            if ((item.score || 0) >= 50) totalPassed++;

            // Subject Performance
            const subject = item.subject || 'Unknown';
            if (!subjectMap[subject]) subjectMap[subject] = { total: 0, scores: [], passed: 0 };
            subjectMap[subject].total++;
            subjectMap[subject].scores.push(item.score || 0);
            if ((item.score || 0) >= 50) subjectMap[subject].passed++;

            // Class Comparison
            const className = item.students?.classes?.name || 'Unknown';
            if (!classMap[className]) classMap[className] = { total: 0, scores: [], passed: 0 };
            classMap[className].total++;
            classMap[className].scores.push(item.score || 0);
            if ((item.score || 0) >= 50) classMap[className].passed++;
        });

        const totalStudents = data.length;

        const gradeDistribution = Object.entries(gradeMap).map(([grade, count]) => ({
            grade,
            count,
            percentage: (count / totalStudents) * 100
        }));

        const subjectPerformance = Object.entries(subjectMap).map(([subject, stats]) => ({
            subject,
            averageScore: Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.total) * 10) / 10,
            passRate: (stats.passed / stats.total) * 100,
            totalStudents: stats.total
        })).sort((a, b) => b.averageScore - a.averageScore);

        const classComparison = Object.entries(classMap).map(([className, stats]) => ({
            className,
            averageGPA: Math.round(((stats.scores.reduce((a, b) => a + b, 0) / stats.total) / 100 * 4) * 10) / 10,
            passRate: Math.round((stats.passed / stats.total) * 100),
            studentCount: stats.total
        })).sort((a, b) => b.averageGPA - a.averageGPA);

        return {
            gradeDistribution,
            subjectPerformance,
            classComparison,
            metrics: {
                overallGPA: Math.round((totalScore / totalStudents / 100 * 4) * 100) / 100,
                passRate: Math.round((totalPassed / totalStudents) * 1000) / 10,
                topPerformer: 'Excellence Student',
                improvement: 0
            }
        };
    }
}
