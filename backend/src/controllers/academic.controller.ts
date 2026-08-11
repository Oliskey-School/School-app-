import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AcademicService } from '../services/academic.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// Report cards / grades contain a student's academic record, teacher and
// principal comments — a parent may only ever pull their OWN linked
// children's, a student only their own. Mirrors the pattern already used in
// attendance.controller.ts / parent.controller.ts.
//
// A TEACHER used to get `null` (unrestricted) here, so any teacher could pull
// ANY other student's full report card in the school — including one in a
// class they have no assignment to — just by knowing the studentId. Verified
// live (round 8 audit) with two real teacher accounts: an unassigned teacher
// got a 200 with full report card data. Scope teachers the same way
// upsertReportCard / calculateClassRankings already do: students enrolled in
// a class the teacher is assigned to via ClassTeacher.
async function getAuthorizedStudentIds(req: AuthRequest): Promise<string[] | null> {
    const role = (req.user.role || '').toLowerCase();
    if (isAdmin(req)) return null; // null = unrestricted
    if (role === 'teacher') {
        const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!teacher) return [];
        const classTeacherRows = await prisma.classTeacher.findMany({ where: { teacher_id: teacher.id }, select: { class_id: true } });
        const classIds = classTeacherRows.map(c => c.class_id);
        if (classIds.length === 0) return [];
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { class_id: { in: classIds }, school_id: req.user.school_id, status: 'Active' },
            select: { student_id: true }
        });
        return enrollments.map(e => e.student_id);
    }
    if (role === 'student') {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return student ? [student.id] : [];
    }
    if (role === 'parent') {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return [];
        const links = await prisma.parentChild.findMany({ where: { parent_id: parent.id, deleted_at: null }, select: { student_id: true } });
        return links.map(l => l.student_id);
    }
    return [];
}

const STAFF_ROLES = ['teacher', 'admin', 'proprietor', 'superadmin', 'super_admin'];

export const saveGrade = async (req: AuthRequest, res: Response) => {
    try {
        // Only staff may write grades. Previously this only special-cased
        // 'teacher' (to check subject/class assignment) and silently let
        // every OTHER role — including student and parent — straight
        // through with no check at all. Verified live: a demo student's
        // own PUT /academic/grade request reached the service layer and was
        // blocked only by an unrelated "must be Active status" business
        // rule, not by any authorization check.
        if (!STAFF_ROLES.includes((req.user.role || '').toLowerCase())) {
            return res.status(403).json({ message: 'Only teachers and admins can enter grades' });
        }

        const { studentId, subject, term, score, session } = req.body;

        if ((req.user.role || '').toLowerCase() === 'teacher') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });

            // Check assignment in Timetable or ClassTeacher 
            const isAssigned = await prisma.timetable.findFirst({
                where: {
                    teacher_id: teacher.id,
                    subject: subject,
                    school_id: req.user.school_id
                }
            });

            if (!isAssigned) {
                // Check if they are a class teacher for any class - fallback for non-timetabled subjects
                const classTeacher = await prisma.classTeacher.findFirst({
                    where: { teacher_id: teacher.id }
                });
                if (!classTeacher) {
                    return res.status(403).json({ message: 'You are not assigned to this subject or class' });
                }
            }
        }

        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await AcademicService.saveGrade(req.user.school_id, branchId, studentId, subject, term, score, session);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds, subject, term } = req.body;

        if ((req.user.role || '').toLowerCase() === 'teacher') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });

            if (!teacher) return res.json([]);

            const isAssigned = await prisma.timetable.findFirst({
                where: {
                    teacher_id: teacher.id,
                    subject: subject,
                    school_id: req.user.school_id
                }
            });

            if (!isAssigned) {
                const classTeacher = await prisma.classTeacher.findFirst({
                    where: { teacher_id: teacher.id }
                });
                if (!classTeacher) {
                    return res.status(403).json({ message: 'You are not assigned to this subject' });
                }
            }
        }

        const allowedStudentIds = await getAuthorizedStudentIds(req);
        let safeStudentIds = studentIds;
        if (allowedStudentIds) {
            safeStudentIds = Array.isArray(studentIds)
                ? studentIds.filter((id: string) => allowedStudentIds.includes(id))
                : [];
            if (safeStudentIds.length === 0) return res.json([]);
        }

        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await AcademicService.getGrades(req.user.school_id, branchId, safeStudentIds, subject, term);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id; // never trust a client-supplied query param over the token
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);

        const result = await AcademicService.getSubjects(schoolId, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id; // never trust a client-supplied query param over the token
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const term = req.query.term as string;
        // class_id is a UUID string, not numeric — parseInt() here always
        // produced NaN (or a wrong truncated number for IDs that happen to
        // start with digits), so the class filter never actually matched.
        const classId = req.query.classId ? req.query.classId as string : null;

        const result = await AcademicService.getAnalytics(schoolId, branchId, term, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id; // never trust a client-supplied query param over the token
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const term = req.query.term as string;
        const session = req.query.session as string;
        const classId = req.query.classId as string;

        const result = await AcademicService.getPerformance(schoolId, branchId, term, session, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getReportCardDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, term, session } = req.query;
        const allowedStudentIds = await getAuthorizedStudentIds(req);
        if (allowedStudentIds && !allowedStudentIds.includes(studentId as string)) {
            return res.status(403).json({ message: 'You do not have access to this student\'s report card' });
        }
        const result = await AcademicService.getReportCardDetails(
            req.user.school_id,
            studentId as string,
            term as string,
            session as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCurricula = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await AcademicService.getCurricula(schoolId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAcademicTracks = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const curriculumId = req.query.curriculumId as string;
        const studentId = req.query.studentId as string;
        const status = req.query.status as string;
        
        const result = await AcademicService.getAcademicTracks(schoolId, {
            curriculum_id: curriculumId,
            student_id: studentId,
            status: status
        });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAcademicTerms = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await AcademicService.getAcademicTerms(schoolId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const upsertReportCard = async (req: AuthRequest, res: Response) => {
    try {
        // Never trust a client-supplied schoolId in the body — an admin/teacher
        // from School A could otherwise target School B's student by sending
        // schoolId: 'other-school-id' and writing/publishing their report card.
        const { studentId, schoolId: _clientSchoolId, ...data } = req.body;
        const finalSchoolId = req.user.school_id;
        const role = (req.user.role || '').toLowerCase();

        // Only staff may write report cards. Previously the checks below
        // only ever ran for role === 'teacher'; a student or parent hit
        // neither branch and could POST an arbitrary studentId + status
        // (including 'Published') straight through.
        if (!STAFF_ROLES.includes(role)) {
            return res.status(403).json({ message: 'Only teachers and admins can write report cards' });
        }

        // Teachers submit results for admin review — only admins publish.
        // Cap a teacher's status at 'Submitted' so results can never go live
        // to students/parents without the admin's approval.
        if (role === 'teacher' && String(data.status || '').toLowerCase() === 'published') {
            data.status = 'Submitted';
        }

        // A teacher may only write a report card for a student enrolled in a
        // class they are actually assigned to — otherwise any teacher could
        // POST an arbitrary studentId and overwrite another class's results.
        if (role === 'teacher') {
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });
            const enrollment = await prisma.studentEnrollment.findFirst({
                where: { student_id: studentId, school_id: finalSchoolId, status: 'Active' },
                select: { class_id: true }
            });
            const access = enrollment
                ? await prisma.classTeacher.findFirst({ where: { teacher_id: teacher.id, class_id: enrollment.class_id } })
                : null;
            if (!access) {
                return res.status(403).json({ message: 'You are not assigned to this student\'s class' });
            }
        }

        const result = await AcademicService.upsertReportCard(studentId as string, finalSchoolId, data);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const promoteStudents = async (req: AuthRequest, res: Response) => {
    try {
        // Moving the whole school up a class is leadership's call only.
        const role = (req.user.role || '').toLowerCase();
        if (!['admin', 'superadmin', 'proprietor'].includes(role)) {
            return res.status(403).json({ message: 'Only an admin can promote students.' });
        }
        const toSession = req.body.toSession;
        if (!toSession) {
            return res.status(400).json({ message: 'toSession is required (e.g. "2026/2027")' });
        }
        // A branch-locked admin must never be able to promote another branch
        // (or, by omitting branchId, the WHOLE school at once) — getEffectiveBranchId
        // locks them to their own branch regardless of what the request sends.
        const branchId = getEffectiveBranchId(req.user, req.body.branchId);
        const result = await AcademicService.promoteStudents(req.user.school_id, branchId, toSession, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getReportCardByCriteria = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const studentId = req.query.studentId as string;
        const term = (req.query.term as string) || (req.query.termId as string);
        const session = req.query.session as string;

        const allowedStudentIds = await getAuthorizedStudentIds(req);
        if (allowedStudentIds && !allowedStudentIds.includes(studentId)) {
            return res.status(403).json({ message: 'You do not have access to this student\'s report card' });
        }

        const result = await AcademicService.getReportByCriteria(schoolId, studentId, term, session);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCurriculumTopics = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, term } = req.query;
        if (!subjectId || !term) {
            return res.status(400).json({ message: 'subjectId and term are required' });
        }
        const result = await AcademicService.getCurriculumTopics(req.user.school_id, subjectId as string, term as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const syncCurriculumData = async (req: AuthRequest, res: Response) => {
    try {
        // Admin-only (components/admin/CurriculumSettingsScreen.tsx is the
        // only caller) — previously open to any authenticated user.
        if (!['admin', 'proprietor', 'superadmin', 'super_admin'].includes((req.user.role || '').toLowerCase())) {
            return res.status(403).json({ message: 'Only admins can sync curriculum data' });
        }
        const { subjectId, source } = req.body;
        if (!subjectId) {
            return res.status(400).json({ message: 'subjectId is required' });
        }
        // Bug fix: (req as any).school_id was always undefined — school_id
        // lives on req.user, not the request object itself.
        const result = await AcademicService.syncCurriculumData(req.user.school_id, subjectId as string, source as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const calculateClassRankings = async (req: AuthRequest, res: Response) => {
    try {
        if (!['ADMIN', 'PROPRIETOR', 'TEACHER'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { classId, term, session } = req.body;
        if (!classId || !term || !session) {
            return res.status(400).json({ message: 'classId, term, and session are required' });
        }

        // A teacher may only recompute rankings for a class they are actually
        // assigned to — otherwise any teacher could overwrite position_in_class
        // / total_score on report cards for any class in the school.
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });
            const access = await prisma.classTeacher.findFirst({ where: { teacher_id: teacher.id, class_id: classId } });
            if (!access) return res.status(403).json({ message: 'You are not assigned to this class' });
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { class_id: classId, school_id: req.user.school_id, status: 'Active' },
            select: { student_id: true }
        });

        if (enrollments.length === 0) return res.json([]);

        const studentIds = enrollments.map((e: { student_id: string }) => e.student_id);

        const performances = await prisma.academicPerformance.findMany({
            where: { student_id: { in: studentIds }, term, session, school_id: req.user.school_id },
            select: { student_id: true, score: true }
        });

        const totals = new Map<string, number>();
        for (const p of performances) {
            totals.set(p.student_id, (totals.get(p.student_id) || 0) + (p.score || 0));
        }

        if (totals.size === 0) return res.json([]);

        const ranked = Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([studentId, totalScore], index) => ({
                studentId, totalScore, position_in_class: index + 1
            }));

        const totalStudents = ranked.length;

        await prisma.$transaction(
            ranked.map(({ studentId, totalScore, position_in_class }) =>
                prisma.reportCard.updateMany({
                    where: { student_id: studentId, class_id: classId, term, session, school_id: req.user.school_id },
                    data: { position_in_class, total_students_in_class: totalStudents, total_score: totalScore }
                })
            )
        );

        res.json(ranked);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
