import { Request, Response } from 'express';
import { BehaviorService } from '../services/behavior.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: any): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}
function isTeacher(req: any): boolean {
    return (req.user.role || '').toLowerCase() === 'teacher';
}

// A parent may only ever see behavior notes for their OWN linked children; a
// student only their own; a teacher only their OWN students (those enrolled
// in a class the teacher is assigned to via ClassTeacher). Returns null only
// when the caller is unrestricted (admin), or a possibly-empty array of
// allowed student ids otherwise.
async function getAuthorizedStudentIds(req: any): Promise<string[] | null> {
    if (isAdmin(req)) return null;
    const role = (req.user.role || '').toLowerCase();
    if (role === 'teacher') {
        return getTeacherClassStudentIds(req);
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

// Resolves the ids of every student currently enrolled in a class the calling
// teacher is assigned to (via ClassTeacher). Used to stop a teacher from
// reading/writing/deleting behavior notes for students outside their classes.
async function getTeacherClassStudentIds(req: any): Promise<string[]> {
    const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    if (!teacher) return [];
    const classes = await prisma.classTeacher.findMany({ where: { teacher_id: teacher.id }, select: { class_id: true } });
    const classIds = classes.map(c => c.class_id);
    if (classIds.length === 0) return [];
    const enrollments = await prisma.studentEnrollment.findMany({
        where: { class_id: { in: classIds }, status: 'Active' },
        select: { student_id: true }
    });
    return [...new Set(enrollments.map(e => e.student_id))];
}

export const getBehaviorNotes = async (req: any, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const allowedStudentIds = await getAuthorizedStudentIds(req);
        if (allowedStudentIds && allowedStudentIds.length === 0) return res.json([]);
        const notes = await BehaviorService.getNotesBySchool(
            req.user.school_id,
            branchId,
            allowedStudentIds || undefined
        );
        res.json(notes);
    } catch (error: any) {
        sendError(res, error, 'behavior.controller.ts');
    }
};

export const createBehaviorNote = async (req: any, res: Response) => {
    try {
        // Only teachers/admins may record a behavior note — otherwise a parent
        // could fabricate a disciplinary note under any teacher's name for any
        // student. Teachers can only ever write as themselves; a client-supplied
        // teacher_id is only honoured for admins.
        if (!isAdmin(req) && !isTeacher(req)) {
            return res.status(403).json({ message: 'Only teachers and admins can create behavior notes' });
        }
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id || req.body.branch_id) as string);
        let teacherId: string | undefined;

        if (isTeacher(req)) {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (!teacher) return res.status(403).json({ message: 'Teacher profile not found' });
            teacherId = teacher.id;

            // A teacher may only write a behavior note for a student enrolled in
            // one of their own classes — not any student in the school/branch.
            const targetStudentId = req.body.student_id || req.body.studentId;
            const ownStudentIds = await getTeacherClassStudentIds(req);
            if (!targetStudentId || !ownStudentIds.includes(targetStudentId)) {
                return res.status(403).json({ message: 'You can only record behavior notes for students in your own classes' });
            }
        } else {
            teacherId = req.body.teacher_id || req.body.teacherId;
        }

        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required and could not be resolved.' });
        }

        const note = await BehaviorService.createNote(
            req.user.school_id,
            branchId as string,
            teacherId,
            req.body
        );
        res.status(201).json(note);
    } catch (error: any) {
        sendError(res, error, 'behavior.controller.ts');
    }
};

export const deleteBehaviorNote = async (req: any, res: Response) => {
    try {
        // Only teachers/admins may delete a behavior note — parents/students
        // must never be able to erase a disciplinary record via a guessed id.
        if (!isAdmin(req) && !isTeacher(req)) {
            return res.status(403).json({ message: 'Only teachers and admins can delete behavior notes' });
        }
        const { id } = req.params;
        const branchId = getEffectiveBranchId(req.user);

        // A teacher may only delete a behavior note for a student in one of
        // their own classes — never another teacher's note on another class.
        if (isTeacher(req) && !isAdmin(req)) {
            const note = await prisma.behaviorNote.findFirst({ where: { id: id as string, school_id: req.user.school_id }, select: { student_id: true } });
            if (!note) return res.status(404).json({ message: 'Behavior note not found' });
            const ownStudentIds = await getTeacherClassStudentIds(req);
            if (!ownStudentIds.includes(note.student_id)) {
                return res.status(403).json({ message: 'You can only delete behavior notes for students in your own classes' });
            }
        }

        await BehaviorService.deleteNote(req.user.school_id, branchId, id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
