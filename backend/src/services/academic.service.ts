import prisma from '../config/database';
import { SocketService } from './socket.service';

export class AcademicService {
    static async saveGrade(schoolId: string, branchId: string | undefined, studentId: string | number, subject: string, term: string, score: number, session: string) {
        const id = String(studentId);

        const student = await prisma.student.findUnique({
            where: { id: id },
            select: { status: true }
        });

        if (!student || student.status !== 'Active') {
            throw new Error('Grades can only be saved for students with Active status.');
        }
        
        const existing = await prisma.academicPerformance.findFirst({
            where: {
                school_id: schoolId,
                student_id: id,
                subject,
                term,
                session
            }
        });

        const result = existing 
            ? await prisma.academicPerformance.update({
                where: { id: existing.id },
                data: { score, last_updated: new Date() }
            })
            : await prisma.academicPerformance.create({
                data: {
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null,
                    student: { connect: { id } },
                    subject,
                    term,
                    score,
                    session,
                    last_updated: new Date()
                }
            });

        SocketService.emitToSchool(schoolId, 'academic:updated', { 
            studentId: id,
            subject,
            term
        });

        return result;
    }

    static async getGrades(schoolId: string, branchId: string | undefined, studentIds: (string | number)[], subject: string, term: string) {
        if (!studentIds || studentIds.length === 0) return [];

        const ids = studentIds.map(String);

        return await prisma.academicPerformance.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                subject: subject,
                term: term,
                student_id: { in: ids }
            },
            select: {
                student_id: true,
                score: true
            }
        });
    }

    static async getSubjects(schoolId: string, branchId: string | undefined) {
        return await prisma.subject.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            orderBy: { name: 'asc' }
        });
    }

    static async getAnalytics(schoolId: string, branchId: string | undefined, selectedTerm: string, selectedClass: number | null) {
        const whereClause: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId;
        }

        // Only include active students in analytics
        whereClause.student = {
            status: 'Active'
        };

        if (selectedTerm && selectedTerm !== 'current' && selectedTerm !== 'all') {
            whereClause.term = selectedTerm;
        }

        if (selectedClass) {
            whereClause.student = {
                enrollments: {
                    some: {
                        class_id: String(selectedClass)
                    }
                }
            };
        }

        const data = await prisma.academicPerformance.findMany({
            where: whereClause,
            include: {
                student: {
                    include: {
                        enrollments: {
                            include: {
                                class: true
                            }
                        }
                    }
                }
            }
        });

        if (!data || data.length === 0) {
            return {
                gradeDistribution: [],
                subjectPerformance: [],
                classComparison: [],
                metrics: { overallGPA: 0, passRate: 0, topPerformer: 'N/A', improvement: 0 }
            };
        }

        const computeGrade = (score: number): string => {
            if (score >= 70) return 'A';
            if (score >= 60) return 'B';
            if (score >= 50) return 'C';
            if (score >= 45) return 'D';
            return 'F';
        };

        const gradeMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
        const subjectMap: Record<string, { total: number, scores: number[], passed: number }> = {};
        const classMap: Record<string, { total: number, scores: number[], passed: number }> = {};
        let totalScore = 0;
        let totalPassed = 0;

        data.forEach((item) => {
            const grade = computeGrade(item.score);
            if (gradeMap[grade] !== undefined) gradeMap[grade]++;

            totalScore += item.score || 0;
            if ((item.score || 0) >= 50) totalPassed++;

            const subject = item.subject || 'Unknown';
            if (!subjectMap[subject]) subjectMap[subject] = { total: 0, scores: [], passed: 0 };
            subjectMap[subject].total++;
            subjectMap[subject].scores.push(item.score || 0);
            if ((item.score || 0) >= 50) subjectMap[subject].passed++;

            const className = (item as any).student?.enrollments?.[0]?.class?.name || 'Unknown';
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

    static async getPerformance(schoolId: string, branchId: string | undefined, term: string | undefined, session: string | undefined, classId: string | undefined) {
        const whereClause: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId;
        }
        if (term) {
            whereClause.term = term;
        }
        if (session) {
            whereClause.session = session;
        }

        const data = await prisma.academicPerformance.findMany({
            where: whereClause
        });

        if (!data || data.length === 0) return [];

        const studentMap = new Map<string, any[]>();
        data.forEach((record) => {
            const existing = studentMap.get(record.student_id) || [];
            existing.push(record);
            studentMap.set(record.student_id, existing);
        });

        const getGrade = (score: number) => {
            if (score >= 70) return 'A';
            if (score >= 60) return 'B';
            if (score >= 50) return 'C';
            if (score >= 45) return 'D';
            return 'F';
        };

        const getRemark = (grade: string) => {
            switch (grade) {
                case 'A': return 'Excellent';
                case 'B': return 'Very Good';
                case 'C': return 'Good';
                case 'D': return 'Pass';
                default: return 'Fail';
            }
        };

        const performance = Array.from(studentMap.entries()).map(([studentId, records]) => {
            const academicRecords = records.map((r) => {
                const score = r.score || 0;
                const ca = Math.round(score * 0.4);
                const exam = Math.round(score * 0.6);
                const total = ca + exam;
                const grade = getGrade(total);
                return {
                    student_id: r.student_id,
                    subject: r.subject,
                    term: r.term,
                    session: r.session,
                    score: r.score,
                    test1: Math.round(ca * 0.5),
                    test2: Math.round(ca * 0.5),
                    ca,
                    exam,
                    total,
                    grade,
                    remark: getRemark(grade)
                };
            });

            return {
                student_id: studentId,
                term: records[0]?.term,
                session: records[0]?.session,
                academicRecords
            };
        });

        return performance;
    }

    static async getReportCardDetails(schoolId: string, studentId: string, term: string, session: string) {
        // 1. Get basic ReportCard record if it exists
        const reportBase = await prisma.reportCard.findFirst({
            where: {
                school_id: schoolId,
                student_id: studentId,
                term,
                session
            }
        });

        // 2. Get Academic Performance (Grades)
        const grades = await prisma.academicPerformance.findMany({
            where: {
                school_id: schoolId,
                student_id: studentId,
                term,
                session
            }
        });

        // 3. Format academic records (using the same logic as getPerformance)
        const academicRecords = grades.map(g => {
            const score = g.score || 0;
            const ca = Math.round(score * 0.4);
            const exam = Math.round(score * 0.6);
            const total = ca + exam;
            
            const getGrade = (s: number) => {
                if (s >= 70) return 'A';
                if (s >= 60) return 'B';
                if (s >= 50) return 'C';
                if (s >= 45) return 'D';
                return 'F';
            };
            const gr = getGrade(total);

            return {
                subject: g.subject,
                ca,
                exam,
                total,
                grade: gr,
                remark: gr === 'A' ? 'Excellent' : gr === 'B' ? 'Very Good' : gr === 'C' ? 'Good' : gr === 'D' ? 'Pass' : 'Fail'
            };
        });

        // 4. Return aggregated report
        const academicData = reportBase?.academic_records as any || {};
        
        return {
            id: reportBase?.id || 'temp-id',
            student_id: studentId,
            term,
            session,
            status: reportBase?.status || (reportBase?.is_published ? 'Published' : 'Draft'),
            position: reportBase?.position_in_class,
            total_students: reportBase?.total_students_in_class,
            academic_records: academicRecords.length > 0 ? academicRecords : (academicData.grades || academicData),
            attendance: {
                total: reportBase?.attendance_count || 0,
                present: reportBase?.attendance_count || 0,
                absent: 0,
                late: 0
            },
            teacher_comment: reportBase?.teacher_remark || '', 
            principal_comment: reportBase?.principal_remark || '',
            skills: academicData.skills || {}, 
            psychomotor: academicData.psychomotor || {}
        };
    }

    // ============================================
    // CURRICULUM & TRACKS
    // ============================================

    static async getCurricula(schoolId: string) {
        return await (prisma as any).curriculum.findMany({
            where: { school_id: schoolId },
            orderBy: { name: 'asc' }
        });
    }

    static async getAcademicTracks(schoolId: string, filters: { curriculum_id?: string; student_id?: string; status?: string }) {
        return await (prisma as any).academicTrack.findMany({
            where: {
                school_id: schoolId,
                ...filters
            },
            include: {
                student: true,
                curriculum: true
            }
        });
    }

    static async getReportByCriteria(schoolId: string, studentId: string, term: string, session: string) {
        return await prisma.reportCard.findFirst({
            where: {
                school_id: schoolId,
                student_id: studentId,
                term: term,
                session: session
            }
        });
    }

    static async getAcademicTerms(schoolId: string) {
        // In a real app, this would query an 'AcademicTerm' model.
        // For now, we return standard terms or deduce from AcademicPerformance.
        const existingData = await prisma.academicPerformance.findMany({
            where: { school_id: schoolId },
            select: { term: true, session: true },
            distinct: ['term', 'session']
        });

        if (existingData.length === 0) {
            return [
                { id: '1st-term-24-25', name: 'First Term', academic_year: '2024/2025', is_current: true, start_date: '2024-09-01', end_date: '2024-12-20' },
                { id: '2nd-term-24-25', name: 'Second Term', academic_year: '2024/2025', is_current: false, start_date: '2025-01-10', end_date: '2025-04-10' }
            ];
        }

        return existingData.map((d, i) => ({
            id: `term-${i}`,
            name: d.term,
            academic_year: d.session,
            is_current: i === 0,
            start_date: '2024-09-01',
            end_date: '2025-07-30'
        }));
    }

    static async upsertReportCard(studentId: string, schoolId: string, data: any) {
        const { term, session, academicRecords, status, attendance, skills, psychomotor, teacherComment, principalComment } = data;

        return await prisma.$transaction(async (tx) => {
            // 1. Upsert individual grades into AcademicPerformance
            for (const record of academicRecords) {
                const existing = await tx.academicPerformance.findFirst({
                    where: {
                        school_id: schoolId,
                        student_id: studentId,
                        subject: record.subject,
                        term,
                        session
                    }
                });

                if (existing) {
                    await tx.academicPerformance.update({
                        where: { id: existing.id },
                        data: {
                            score: record.total, // Using total as the canonical score for now
                            last_updated: new Date()
                        }
                    });
                } else {
                    await tx.academicPerformance.create({
                        data: {
                            school_id: schoolId,
                            student_id: studentId,
                            subject: record.subject,
                            term,
                            session,
                            score: record.total,
                            last_updated: new Date()
                        }
                    });
                }
            }

            // 2. Upsert the ReportCard summary record
            const existingRC = await tx.reportCard.findFirst({
                where: { school_id: schoolId, student_id: studentId, term, session }
            });

            // Calculate summary scores from academicRecords if they were sent
            const totalScore = academicRecords.reduce((acc: number, r: any) => acc + (r.total || 0), 0);
            const avgScore = academicRecords.length > 0 ? totalScore / academicRecords.length : 0;

            // Prepare the structured JSON for academic_records to include everything
            const academicRecordsJson = {
                grades: academicRecords,
                skills: skills || {},
                psychomotor: psychomotor || {}
            };

            const result = existingRC 
                ? await tx.reportCard.update({
                    where: { id: existingRC.id },
                    data: {
                        status: status || existingRC.status || 'Draft',
                        is_published: status === 'Published',
                        total_score: totalScore,
                        average_score: avgScore,
                        academic_records: academicRecordsJson as any,
                        attendance_count: attendance?.present || 0,
                        principal_remark: principalComment || data.principal_remark,
                        teacher_remark: teacherComment || data.teacher_remark,
                    }
                })
                : await tx.reportCard.create({
                    data: {
                        school_id: schoolId,
                        student_id: studentId,
                        term,
                        session,
                        status: status || 'Draft',
                        is_published: status === 'Published',
                        total_score: totalScore,
                        average_score: avgScore,
                        academic_records: academicRecordsJson as any,
                        attendance_count: attendance?.present || 0,
                        principal_remark: principalComment || data.principal_remark,
                        teacher_remark: teacherComment || data.teacher_remark,
                    }
                });

            SocketService.emitToSchool(schoolId, 'report-card:updated', { 
                studentId,
                term,
                session
            });

            return result;
        });
    }

    static async getCurriculumTopics(subjectId: string, term: string) {
        return await (prisma as any).curriculumTopic.findMany({
            where: { subject_id: subjectId, term },
            orderBy: { week_number: 'asc' }
        });
    }

    static async syncCurriculumData(subjectId: string, source: string) {
        // Mock sync logic: Generate standard topics for the subject
        const mockTopics = [
            { week_number: 1, title: 'Introduction to Course', content: 'Overview of the term syllabus and objectives.' },
            { week_number: 2, title: 'Foundational Concepts', content: 'Deep dive into basic principles and definitions.' },
            { week_number: 3, title: 'Core Analysis', content: 'Methodologies and initial data exploration.' },
            { week_number: 4, title: 'Mid-term Review', content: 'Consolidation of topics covered in weeks 1-3.' }
        ];

        const results = [];
        for (const topic of mockTopics) {
            const created = await (prisma as any).curriculumTopic.create({
                data: {
                    subject_id: subjectId,
                    term: 'Term 1', // Defaulting for simple mock
                    ...topic
                }
            });
            results.push(created);
        }
        return results;
    }
}
