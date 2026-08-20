import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExamService } from '../services/exam.service';
import { TeacherAssignmentService } from '../services/teacherAssignment.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

export const upsertExamResults = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.headers['x-branch-id'] as string);
        const results = req.body;
        if (!Array.isArray(results) || results.length === 0) {
            return res.status(400).json({ message: 'results must be a non-empty array' });
        }

        // Score entry is restricted to the exam's own teacher OR the assigned
        // Subject Teacher of that class+subject — a Class Teacher (or any other
        // teacher) must not be able to edit marks for a subject they don't teach.
        if (!ADMIN_ROLES.includes((req.user.role || '').toLowerCase())) {
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!teacher) return res.status(403).json({ message: 'No teacher profile found for this account' });

            const examIds = [...new Set(results.map((r: any) => r.exam_id).filter(Boolean))] as string[];
            const exams = await prisma.exam.findMany({ where: { id: { in: examIds }, school_id: schoolId } });
            if (exams.length !== examIds.length) return res.status(404).json({ message: 'Exam not found' });

            for (const exam of exams) {
                if (exam.teacher_id === teacher.id) continue; // owns the exam directly
                const subject = exam.class_id
                    ? await prisma.subject.findFirst({ where: { school_id: schoolId, name: { equals: exam.subject, mode: 'insensitive' } }, select: { id: true } })
                    : null;
                const isAssigned = subject && exam.class_id
                    ? await TeacherAssignmentService.isSubjectTeacherOf(teacher.id, exam.class_id, subject.id)
                    : false;
                if (!isAssigned) {
                    return res.status(403).json({ message: `You are not the assigned Subject Teacher for "${exam.subject}" in this class` });
                }
            }
        }

        const saved = await ExamService.upsertExamResults(schoolId, branchId, results);
        res.status(201).json({ saved: saved.length, results: saved });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getExams = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        // The JWT carries an UPPERCASE role ("TEACHER"), so the old strict
        // `=== 'teacher'` comparison never matched and teacherId stayed
        // undefined — every teacher saw every exam in the school (verified
        // live: byte-identical response to the admin's). Normalise like every
        // other role check in this codebase does.
        if ((req.user.role || '').toLowerCase() === 'teacher') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ExamService.getExams(req.user.school_id, branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createExam = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ExamService.createExam(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateExam = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ExamService.updateExam(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteExam = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        await ExamService.deleteExam(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getExamResults = async (req: AuthRequest, res: Response) => {
    try {
        // This returns EVERY student's score/grade for the exam (the teacher
        // results-entry grading view) — it had no role check at all, so any
        // authenticated student could read every classmate's exam results by
        // guessing/enumerating exam IDs, the same gap pattern as the quiz
        // submissions endpoint fixed last round. Restrict to staff, and a
        // non-admin teacher only to an exam they're the assigned teacher for
        // (same ownership rule already enforced on upsertExamResults above).
        const role = (req.user.role || '').toLowerCase();
        if (!ADMIN_ROLES.includes(role)) {
            if (role !== 'teacher') {
                return res.status(403).json({ message: 'Only staff can view exam results' });
            }
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!teacher) return res.status(403).json({ message: 'No teacher profile found for this account' });
            const exam = await prisma.exam.findFirst({ where: { id: req.params.id as string, school_id: req.user.school_id } });
            if (!exam) return res.status(404).json({ message: 'Exam not found' });
            if (exam.teacher_id !== teacher.id) {
                const subject = exam.class_id
                    ? await prisma.subject.findFirst({ where: { school_id: req.user.school_id, name: { equals: exam.subject, mode: 'insensitive' } }, select: { id: true } })
                    : null;
                const isAssigned = subject && exam.class_id
                    ? await TeacherAssignmentService.isSubjectTeacherOf(teacher.id, exam.class_id, subject.id)
                    : false;
                if (!isAssigned) {
                    return res.status(403).json({ message: `You are not the assigned Subject Teacher for "${exam.subject}" in this class` });
                }
            }
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ExamService.getExamResults(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
