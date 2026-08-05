import prisma from '../config/database';
import { SocketService } from './socket.service';
import { AcademicSettingsService } from './academicSettings.service';

export class AcademicService {
    private static async getCurriculumSettings(schoolId: string, branchId?: string) {
        // Configured academics win over the curriculum default: if this branch (or the
        // school) has a saved grading scheme, build the grading function from its bands.
        const raw = (branchId ? await AcademicSettingsService.getRaw(schoolId, branchId) : null)
            || await AcademicSettingsService.getRaw(schoolId, null);
        const cfg = raw?.grading as any;
        if (cfg && Array.isArray(cfg.bands) && cfg.bands.length) {
            const bands = [...cfg.bands].sort((a: any, b: any) => b.min - a.min);
            return {
                ca_percent: typeof cfg.ca_percent === 'number' ? cfg.ca_percent : 0.4,
                exam_percent: typeof cfg.exam_percent === 'number' ? cfg.exam_percent : 0.6,
                grading: (score: number) => {
                    const band = bands.find((b: any) => score >= b.min && score <= b.max) || bands[bands.length - 1];
                    return { grade: band.grade, remark: band.remark };
                },
            };
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { curricula_config: true }
        });

        const curricula = school?.curricula_config || ['NIGERIAN'];
        
        // Default to Nigerian settings if multiple are selected but first one is Nigerian
        // In a real system, this might be more complex (per-class or per-student track)
        if (curricula.includes('BRITISH') && !curricula.includes('NIGERIAN')) {
            return {
                ca_percent: 0.3,
                exam_percent: 0.7,
                grading: (score: number) => {
                    if (score >= 90) return { grade: 'A*', remark: 'Distinction' };
                    if (score >= 80) return { grade: 'A', remark: 'Excellent' };
                    if (score >= 70) return { grade: 'B', remark: 'Very Good' };
                    if (score >= 60) return { grade: 'C', remark: 'Good' };
                    if (score >= 50) return { grade: 'D', remark: 'Pass' };
                    return { grade: 'U', remark: 'Ungraded' };
                }
            };
        }

        // Default Nigerian Settings
        return {
            ca_percent: 0.4,
            exam_percent: 0.6,
            grading: (score: number) => {
                if (score >= 70) return { grade: 'A', remark: 'Excellent' };
                if (score >= 60) return { grade: 'B', remark: 'Very Good' };
                if (score >= 50) return { grade: 'C', remark: 'Good' };
                if (score >= 45) return { grade: 'D', remark: 'Pass' };
                return { grade: 'F', remark: 'Fail' };
            }
        };
    }

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
        // Include untagged (branch_id null) subjects alongside this branch's own —
        // see subject.service.ts::getSubjects for why (shared/legacy rows a class
        // in this branch can still be linked to).
        return await prisma.subject.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { OR: [{ branch_id: branchId }, { branch_id: null }] } : {})
            },
            orderBy: { name: 'asc' }
        });
    }

    static async getAnalytics(schoolId: string, branchId: string | undefined, selectedTerm: string, selectedClass: string | null) {
        const whereClause: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId;
        }

        if (selectedTerm && selectedTerm !== 'current' && selectedTerm !== 'all') {
            whereClause.term = selectedTerm;
        }

        // Only include active students in analytics — merge with, don't replace,
        // the class filter below (assigning a second time to whereClause.student
        // was overwriting this and letting withdrawn/inactive students' scores
        // back in whenever a class was selected). The enrollment match also
        // needs status: 'Active' — without it, a student who used to be in the
        // selected class (promoted/transferred since) still matched on their
        // stale historical enrollment row.
        whereClause.student = {
            status: 'Active',
            ...(selectedClass ? { enrollments: { some: { class_id: selectedClass, status: 'Active' } } } : {})
        };

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
                metrics: { overallGPA: 0, passRate: 0, topPerformer: 'N/A', topPerformerGPA: 0, improvement: 0 }
            };
        }
        const totalStudents = data.length;
        const settings = await this.getCurriculumSettings(schoolId);

        const computeGrade = (score: number): string => {
            return settings.grading(score).grade;
        };

        const gradeMap: Record<string, number> = {};
        // Initialize gradeMap based on curriculum
        if (settings.ca_percent === 0.3) {
            ['A*', 'A', 'B', 'C', 'D', 'U'].forEach(g => gradeMap[g] = 0);
        } else {
            ['A', 'B', 'C', 'D', 'F'].forEach(g => gradeMap[g] = 0);
        }

        const subjectMap: Record<string, { total: number, scores: number[], passed: number }> = {};
        const classMap: Record<string, { total: number, scores: number[], passed: number }> = {};
        // Per-student average, to find a REAL top performer instead of a
        // hard-coded placeholder name.
        const studentMap: Record<string, { name: string, scores: number[] }> = {};
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

            // A student can carry old/inactive enrollment rows from classes
            // they've since left (promotions, transfers) — enrollments[0] isn't
            // reliably the current one, so pick the Active enrollment
            // specifically instead of blindly trusting array order.
            const enrollments = (item as any).student?.enrollments || [];
            const activeEnrollment = enrollments.find((e: any) => e.status === 'Active') || enrollments[0];
            const className = activeEnrollment?.class?.name || 'Unknown';
            if (!classMap[className]) classMap[className] = { total: 0, scores: [], passed: 0 };
            classMap[className].total++;
            classMap[className].scores.push(item.score || 0);
            if ((item.score || 0) >= 50) classMap[className].passed++;

            const studentId = item.student_id;
            const studentName = (item as any).student?.full_name || 'Unknown Student';
            if (!studentMap[studentId]) studentMap[studentId] = { name: studentName, scores: [] };
            studentMap[studentId].scores.push(item.score || 0);
        });

        let topPerformer = 'N/A';
        let topPerformerAvg = -1;
        Object.values(studentMap).forEach(s => {
            const avg = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
            if (avg > topPerformerAvg) {
                topPerformerAvg = avg;
                topPerformer = s.name;
            }
        });

        // Real term-over-term improvement — only computable when a specific
        // canonical term is selected (need a distinct "previous term" to
        // compare against); otherwise there's no honest baseline, so it's 0
        // rather than a fabricated number.
        let improvement = 0;
        const CANONICAL_TERMS = ['First Term', 'Second Term', 'Third Term'];
        const termIndex = CANONICAL_TERMS.indexOf(selectedTerm);
        if (termIndex > 0) {
            const previousTermWhere = { ...whereClause, term: CANONICAL_TERMS[termIndex - 1] };
            const previousTermData = await prisma.academicPerformance.findMany({
                where: previousTermWhere,
                select: { score: true }
            });
            if (previousTermData.length > 0) {
                const previousAvg = previousTermData.reduce((sum, d) => sum + (d.score || 0), 0) / previousTermData.length;
                const currentAvg = totalScore / data.length;
                if (previousAvg > 0) {
                    improvement = Math.round(((currentAvg - previousAvg) / previousAvg) * 1000) / 10;
                }
            }
        }

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
                topPerformer,
                topPerformerGPA: topPerformerAvg > 0 ? Math.round((topPerformerAvg / 100 * 4) * 10) / 10 : 0,
                improvement
            }
        };
    }

    static async getPerformance(schoolId: string, branchId: string | undefined, term: string | undefined, session: string | undefined, classId: string | undefined) {
        const settings = await this.getCurriculumSettings(schoolId);
        
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

        const performance = Array.from(studentMap.entries()).map(([studentId, records]) => {
            const academicRecords = records.map((r) => {
                const score = r.score || 0;
                const ca = Math.round(score * settings.ca_percent);
                const exam = Math.round(score * settings.exam_percent);
                const total = ca + exam;
                const gradingResult = settings.grading(total);
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
                    grade: gradingResult.grade,
                    remark: gradingResult.remark
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
        const settings = await this.getCurriculumSettings(schoolId);

        // 1. Get basic ReportCard record if it exists
        const reportBase = await prisma.reportCard.findFirst({
            where: {
                school_id: schoolId,
                student_id: studentId,
                term,
                session
            }
        });

        // 2. Get detailed records from the JSON blob first
        const academicData = reportBase?.academic_records as any || {};
        const storedGrades = academicData.grades || [];

        // 3. Get Academic Performance (Grades) from table as fallback
        const grades = await prisma.academicPerformance.findMany({
            where: {
                school_id: schoolId,
                student_id: studentId,
                term,
                session
            }
        });

        // 4. Format academic records
        // If we have detailed stored grades, use them and ensure they have 'ca' field
        const academicRecords = storedGrades.length > 0 ? storedGrades.map((g: any) => ({
            ...g,
            ca: g.ca || (Number(g.test1 || 0) + Number(g.test2 || 0)),
            exam: g.exam || 0,
            total: g.total || (Number(g.ca || 0) + Number(g.exam || 0)),
            grade: g.grade || '—',
            remark: g.remark || '—'
        })) : grades.map(g => {
            const score = g.score || 0;
            const ca = Math.round(score * settings.ca_percent);
            const exam = Math.round(score * settings.exam_percent);
            const total = ca + exam;
            
            const gradingResult = settings.grading(total);

            return {
                subject: g.subject,
                ca,
                exam,
                total,
                grade: gradingResult.grade,
                remark: gradingResult.remark
            };
        });

        return {
            id: reportBase?.id || 'temp-id',
            student_id: studentId,
            term,
            session,
            status: reportBase?.status || (reportBase?.is_published ? 'Published' : 'Draft'),
            position: reportBase?.position_in_class,
            total_students: reportBase?.total_students_in_class,
            academic_records: academicRecords,
            attendance: academicData.attendance || {
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
        // Use the existing logic from getReportCardDetails to ensure consistency
        return await this.getReportCardDetails(schoolId, studentId, term, session);
    }

    static async getAcademicTerms(schoolId: string, branchId?: string) {
        // Term names come from the configured academics (branch override → school
        // default → the built-in three Nigerian terms). We return all of them
        // for the current session plus any session that already has data, so the
        // gradebook/report card can pick any term. The `id` is a stable, name-based
        // key (`"<session>|<term>"`) — report cards are keyed by term NAME, so the
        // id and name resolve to the SAME thing and drafts reload correctly.
        const existing = await prisma.academicPerformance.findMany({
            where: { school_id: schoolId },
            select: { session: true },
            distinct: ['session'],
        });

        const now = new Date();
        // Nigerian sessions start in September.
        const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        const currentSession = `${startYear}/${startYear + 1}`;

        const sessions = Array.from(new Set([
            currentSession,
            ...existing.map(e => e.session).filter(Boolean) as string[],
        ]));

        const eff = await AcademicSettingsService.getEffective(schoolId, branchId);
        const TERM_NAMES = (Array.isArray(eff.terms) && eff.terms.length)
            ? [...eff.terms].sort((a, b) => (a.order || 0) - (b.order || 0)).map(t => t.name)
            : ['First Term', 'Second Term', 'Third Term'];
        const result: any[] = [];
        for (const session of sessions) {
            const sy = parseInt(String(session).split('/')[0], 10) || startYear;
            const windows = [
                { start: `${sy}-09-01`, end: `${sy}-12-20` },
                { start: `${sy + 1}-01-10`, end: `${sy + 1}-04-10` },
                { start: `${sy + 1}-04-25`, end: `${sy + 1}-07-30` },
            ];
            TERM_NAMES.forEach((name, i) => {
                result.push({
                    id: `${session}|${name}`,
                    name,
                    academic_year: session,
                    is_current: session === currentSession && i === 0,
                    start_date: windows[i]?.start,
                    end_date: windows[i]?.end,
                });
            });
        }
        return result;
    }

    static async upsertReportCard(studentId: string, schoolId: string, data: any) {
        const { academicRecords, status, attendance, skills, psychomotor, teacherComment, principalComment } = data;
        // session/term are REQUIRED on AcademicPerformance — default them when the
        // caller omits them so the save never 500s. Nigerian sessions start in September.
        const term = data.term || 'First Term';
        const now = new Date();
        const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        const session = data.session || `${startYear}/${startYear + 1}`;

        // Resolve the branch — explicit from the caller, else the student's own.
        // Untagged report cards vanish from branch-scoped views (strict isolation),
        // so a branch admin would never see what their teachers submitted.
        const studentRow = await prisma.student.findUnique({
            where: { id: studentId },
            select: { branch_id: true }
        });
        const branchId = (data.branchId && data.branchId !== 'all')
            ? data.branchId
            : (studentRow?.branch_id ?? null);

        return await prisma.$transaction(async (tx) => {
            // 0. Clean up existing AcademicPerformance records for this term/session that are NOT in the new list
            // This ensures consistency if subjects are removed from a student's curriculum
            const newSubjects = academicRecords.map((r: any) => r.subject);
            await tx.academicPerformance.deleteMany({
                where: {
                    school_id: schoolId,
                    student_id: studentId,
                    term,
                    session,
                    subject: { notIn: newSubjects }
                }
            });

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
                            branch_id: branchId,
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
                psychomotor: psychomotor || {},
                attendance: attendance || {} // Ensure attendance is included
            };

            const result = existingRC
                ? await tx.reportCard.update({
                    where: { id: existingRC.id },
                    data: {
                        // Backfill the branch on legacy untagged rows
                        branch_id: existingRC.branch_id ?? branchId,
                        status: status || existingRC.status || 'Draft',
                        is_published: status === 'Published',
                        total_score: totalScore,
                        average_score: avgScore,
                        academic_records: academicRecordsJson as any,
                        attendance_count: attendance?.present || 0,
                        principal_remark: principalComment || data.principal_remark,
                        teacher_remark: teacherComment || data.teacher_remark,
                        position_in_class: data.position ?? existingRC.position_in_class,
                        total_students_in_class: data.total_students ?? existingRC.total_students_in_class
                    }
                })
                : await tx.reportCard.create({
                    data: {
                        school_id: schoolId,
                        branch_id: branchId,
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
                        position_in_class: data.position,
                        total_students_in_class: data.total_students
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

    // ============================================
    // END-OF-SESSION PROMOTION
    // ============================================
    // Moves every Active student up one grade for the new session:
    //  - grade < 12  → grade + 1; old enrollments Completed; enrolled into the
    //    next class (same section preferred) when one exists in the branch
    //  - grade >= 12 → status Graduated; enrollments Completed
    // Each promoted/graduated student (and their linked parents) gets a
    // celebration notification the dashboards animate on.
    static async promoteStudents(schoolId: string, branchId: string | undefined, toSession: string, actorId?: string) {
        const effectiveBranch = branchId && branchId !== 'all' ? branchId : undefined;
        const students = await prisma.student.findMany({
            where: {
                school_id: schoolId,
                ...(effectiveBranch ? { branch_id: effectiveBranch } : {}),
                status: 'Active',
                deleted_at: null,
            },
            select: { id: true, user_id: true, full_name: true, grade: true, section: true, branch_id: true }
        });
        if (students.length === 0) return { promoted: 0, graduated: 0, unplaced: 0, total: 0 };

        const classes = await prisma.class.findMany({
            where: { school_id: schoolId, deleted_at: null },
            select: { id: true, grade: true, section: true, branch_id: true, name: true }
        });
        const targetClass = (grade: number, section: string | null, branch: string | null) => {
            const pool = classes.filter(c => c.grade === grade && (!branch || c.branch_id === branch || c.branch_id === null));
            return pool.find(c => section && c.section === section) || pool[0] || null;
        };

        let promoted = 0, graduated = 0, unplaced = 0;
        const notifications: any[] = [];

        for (const s of students) {
            const grade = s.grade ?? 0;
            if (grade >= 12) {
                // Snapshot the class they graduated from — the alumni archive
                // must keep showing this even after classes are renamed/reused.
                const currentClass = classes.find(c => c.grade === grade
                    && (!s.branch_id || c.branch_id === s.branch_id || c.branch_id === null)
                    && (!s.section || c.section === s.section));
                const exitClassName = currentClass
                    ? `${currentClass.name}${currentClass.section ? ` ${currentClass.section}` : ''}`
                    : `Grade ${grade}`;
                await prisma.$transaction([
                    prisma.student.update({
                        where: { id: s.id },
                        data: {
                            status: 'Graduated', updated_by: actorId,
                            exit_year: new Date().getFullYear(),
                            exit_class: exitClassName,
                            exit_date: new Date(),
                        }
                    }),
                    prisma.studentEnrollment.updateMany({
                        where: { student_id: s.id, status: 'Active' },
                        // Clearing is_primary here (not just status) matters: other
                        // lookups resolve a student's "current" class by is_primary
                        // alone, regardless of status — leaving it set on a graduated
                        // enrollment made that old class look current again.
                        data: { status: 'Completed', is_primary: false }
                    }),
                ]);
                graduated++;
                notifications.push({
                    school_id: schoolId, branch_id: s.branch_id, user_id: s.user_id,
                    title: '🎓 Congratulations, Graduate!',
                    message: `Dear ${s.full_name}, you have successfully completed your studies. We are proud of you — congratulations on graduating!`,
                    category: 'promotion', audience: ['student'],
                });
            } else {
                const nextGrade = grade + 1;
                const next = targetClass(nextGrade, s.section ?? null, s.branch_id ?? null);
                const tx: any[] = [
                    prisma.student.update({ where: { id: s.id }, data: { grade: nextGrade, updated_by: actorId } }),
                    prisma.studentEnrollment.updateMany({
                        where: { student_id: s.id, status: 'Active' },
                        // Same reasoning as the graduation branch above: clear
                        // is_primary along with status, or the old class keeps
                        // winning any lookup that only checks is_primary.
                        data: { status: 'Completed', is_primary: false }
                    }),
                ];
                if (next) {
                    tx.push(prisma.studentEnrollment.upsert({
                        where: { student_id_class_id: { student_id: s.id, class_id: next.id } },
                        create: {
                            student_id: s.id, class_id: next.id, school_id: schoolId,
                            branch_id: s.branch_id, status: 'Active', is_primary: true,
                        },
                        update: { status: 'Active', is_primary: true },
                    }));
                } else {
                    unplaced++;
                }
                await prisma.$transaction(tx);
                promoted++;
                const className = next ? `${next.name}${next.section ? ` ${next.section}` : ''}` : `the next class`;
                notifications.push({
                    school_id: schoolId, branch_id: s.branch_id, user_id: s.user_id,
                    title: '🎉 You have been promoted!',
                    message: `Congratulations ${s.full_name}! You have been promoted to ${className} for the ${toSession} session. Keep up the great work!`,
                    category: 'promotion', audience: ['student'],
                });
            }
        }

        // Tell the parents too — their dashboard celebrates alongside the child's.
        const links = await prisma.parentChild.findMany({
            where: { school_id: schoolId, student_id: { in: students.map(s => s.id) }, deleted_at: null },
            include: { parent: { select: { user_id: true } }, student: { select: { full_name: true, branch_id: true, grade: true, status: true } } }
        });
        for (const link of links) {
            if (!link.parent?.user_id) continue;
            const st: any = link.student;
            notifications.push({
                school_id: schoolId, branch_id: st?.branch_id ?? null, user_id: link.parent.user_id,
                title: st?.status === 'Graduated' ? '🎓 Your child has graduated!' : '🎉 Your child has been promoted!',
                message: st?.status === 'Graduated'
                    ? `Congratulations! ${st?.full_name} has successfully graduated. We celebrate this milestone with your family.`
                    : `Great news! ${st?.full_name} has been promoted for the ${toSession} session. Congratulations to your family!`,
                category: 'promotion', audience: ['parent'],
            });
        }

        // Let teachers and school admins know the new session has begun — a
        // plain bell notice (category 'session-start'), NOT the confetti modal.
        // The celebration is reserved for the promoted students and their
        // parents; staff just need awareness that rosters have advanced. The
        // admin who ran it (actorId) already sees the inline result, so skip them.
        const staff = await prisma.user.findMany({
            where: {
                school_id: schoolId,
                role: { in: ['TEACHER', 'ADMIN', 'PROPRIETOR'] as any },
                ...(effectiveBranch ? { branch_id: effectiveBranch } : {}),
                ...(actorId ? { id: { not: actorId } } : {}),
            },
            select: { id: true, role: true, branch_id: true },
        });
        for (const u of staff) {
            notifications.push({
                school_id: schoolId, branch_id: u.branch_id ?? null, user_id: u.id,
                title: '📅 New session started',
                message: `The school has advanced to the ${toSession} session. ${promoted} student(s) were promoted and ${graduated} graduated. Class registers have been updated.`,
                category: 'session-start',
                audience: [String(u.role).toLowerCase() === 'teacher' ? 'teacher' : 'admin'],
            });
        }

        if (notifications.length) {
            await prisma.notification.createMany({ data: notifications });
        }

        SocketService.emitToSchool(schoolId, 'student:updated', { action: 'promotion', toSession });
        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'promotion' });
        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'promotion', toSession });

        return { promoted, graduated, unplaced, total: students.length };
    }

    static async getCurriculumTopics(schoolId: string, subjectId: string, term: string) {
        return await (prisma as any).curriculumTopic.findMany({
            where: { 
                subject_id: subjectId, 
                term,
                school_id: schoolId // Assuming CurriculumTopic has school_id
            },
            orderBy: { week_number: 'asc' }
        });
    }

    static async syncCurriculumData(schoolId: string, subjectId: string, source: string) {
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
                    school_id: schoolId, // Added missing school_id
                    ...topic
                }
            });
            results.push(created);
        }
        return results;
    }
}
