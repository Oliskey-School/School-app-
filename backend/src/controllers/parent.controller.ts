import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ParentService } from '../services/parent.service';
import { TransactionService } from '../services/transaction.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// A parent must only ever act on their OWN linked children — never trust a
// client-supplied studentId. Mirrors the same pattern already used correctly
// in departure.controller.ts.
async function assertParentOwnsStudent(req: AuthRequest, studentId: string): Promise<void> {
    if (isAdmin(req)) return;
    const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    if (!parent) throw new Error('Not found');
    const link = await prisma.parentChild.findFirst({ where: { parent_id: parent.id, student_id: studentId, deleted_at: null } });
    if (!link) throw new Error('Student not found');
}

export const getParents = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can list parents' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ParentService.getParents(req.user.school_id, branchId);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getParentsByClassId = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            // Teachers legitimately need this (e.g. to notify parents when
            // publishing an assignment for their own class) — but only for a
            // class they are actually assigned to teach, never any class in
            // the school. Without this, every teacher-triggered "notify
            // parents" call 403s and the notification silently never sends.
            if ((req.user.role || '').toLowerCase() !== 'teacher') {
                return res.status(403).json({ message: 'Only admins can list parents by class' });
            }
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            const assigned = teacher && await prisma.classTeacher.findFirst({
                where: {
                    school_id: req.user.school_id,
                    teacher_id: teacher.id,
                    class_id: req.params.classId as string,
                    status: 'active',
                    deleted_at: null,
                },
                select: { id: true }
            });
            if (!assigned) return res.status(403).json({ message: 'You are not assigned to this class' });
        }
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ParentService.getParentsByClassId((req.user.school_id as string), branchId, (req.params.classId as string));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createParent = async (req: AuthRequest, res: Response) => {
    // Log only non-sensitive shape info, never the raw body — it carries a
    // student/parent's name, email and phone, and would silently start
    // leaking credentials too if a password field is ever added to this payload.
    console.log('📡 [ParentController] createParent called', { schoolId: req.user?.school_id, hasEmail: !!req.body?.email });
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create parent accounts' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ParentService.createParent(req.user.school_id, branchId, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('🔥 [ParentController] createParent Error Details:', error);
        res.status(error.status || 400).json({ message: error.message });
    }
};

export const getParentById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getParentById(req.user.school_id, branchId, req.params.id as string);
        if (!result) return res.status(404).json({ message: 'Parent not found' });
        if (!isAdmin(req) && result.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have access to this parent record' });
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateParent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update parent records' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ParentService.updateParent(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteParent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete parent records' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id || (req.query.branchId as string));
        await ParentService.deleteParent(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await ParentService.getParentProfile(req.user.school_id, branchId, req.user.id);
        if (!result) return res.status(404).json({ message: 'Parent profile not found' });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyChildren = async (req: AuthRequest, res: Response) => {
    try {
        // Parents should see ALL their children linked across the entire school,
        // so we explicitly pass undefined for branchId to bypass any branch-specific filtering.
        const result = await ParentService.getChildren(req.user.school_id, undefined, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getChildrenForParent = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const parentId = req.params.id as string;
        
        const parent = await prisma.parent.findFirst({ 
            where: { 
                id: parentId,
                school_id: req.user.school_id
            } 
        });
        if (!parent) return res.status(404).json({ message: 'Parent profile not found in your school' });
        if (!isAdmin(req) && parent.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have access to this parent\'s children' });
        }

        const result = await ParentService.getChildren(req.user.school_id, branchId, parent.user_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


// Admins can link/unlink any parent to any student. A parent may only act on
// their OWN account (parentId in the request body must resolve to their own
// user/parent record) — never on behalf of another parent. This is what lets
// the parent-facing "Link a New Child" self-service screen work at all, while
// still stopping a parent from linking themselves to (or unlinking) a child
// via someone else's parent account.
async function assertActingOnOwnParentAccount(req: AuthRequest, parentId: string): Promise<boolean> {
    if (isAdmin(req)) return true;
    if ((req.user.role || '').toLowerCase() !== 'parent') return false;
    const ownParent = await prisma.parent.findFirst({
        where: { user_id: req.user.id, school_id: req.user.school_id },
        select: { id: true, user_id: true }
    });
    if (!ownParent) return false;
    return parentId === ownParent.id || parentId === ownParent.user_id;
}

// Proof-of-relationship for parent self-service linking. The parent must supply
// a detail only someone who actually knows the child would have: the child's
// date of birth, or their admission number. Matched against the student record
// inside the caller's own school.
async function assertProvesRelationship(
    schoolId: string,
    studentIdOrCode: string,
    body: any
): Promise<{ ok: boolean; message?: string }> {
    const dateOfBirth: string | undefined = body?.dateOfBirth || body?.date_of_birth;
    const admissionNumber: string | undefined = body?.admissionNumber || body?.admission_number;

    if (!dateOfBirth && !admissionNumber) {
        return { ok: false, message: "To link a child you must confirm the child's date of birth or admission number." };
    }

    const code = String(studentIdOrCode).trim();
    const student = await prisma.student.findFirst({
        where: {
            school_id: schoolId,
            deleted_at: null,
            OR: [
                { id: code },
                { school_generated_id: code },
                { admission_number: code }
            ]
        },
        select: { dob: true, admission_number: true }
    });

    // Deliberately the SAME message as a failed match, so this endpoint cannot
    // be used to probe which student codes exist.
    const denied = { ok: false, message: "The details provided do not match our records for that student." };
    if (!student) return denied;

    if (admissionNumber && student.admission_number
        && String(admissionNumber).trim().toLowerCase() === student.admission_number.trim().toLowerCase()) {
        return { ok: true };
    }

    if (dateOfBirth && student.dob) {
        const supplied = new Date(dateOfBirth);
        if (!isNaN(supplied.getTime())) {
            const asDay = (d: Date) => d.toISOString().slice(0, 10);
            if (asDay(supplied) === asDay(new Date(student.dob))) {
                return { ok: true };
            }
        }
    }

    return denied;
}

export const linkChild = async (req: AuthRequest, res: Response) => {
    try {
        const { parentId, studentId } = req.body;
        console.log('📡 [ParentController] linkChild called with:', { parentId, studentId });

        if (!parentId || !studentId) {
            return res.status(400).json({ message: 'parentId and studentId are required' });
        }

        if (!(await assertActingOnOwnParentAccount(req, parentId))) {
            return res.status(403).json({ message: 'You may only link a child to your own account' });
        }

        // Acting on your OWN account is not the same as being entitled to THIS
        // child. Student codes are sequential and guessable (…_STU_0001), so
        // without a second factor any parent could enumerate codes and claim
        // any child in the school. Admins are exempt — they link on the
        // school's authority.
        if (!isAdmin(req)) {
            const proof = await assertProvesRelationship(req.user.school_id, studentId, req.body);
            if (!proof.ok) {
                return res.status(403).json({ message: proof.message });
            }
        }

        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ParentService.linkChild(req.user.school_id, branchId, parentId, studentId);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('❌ [ParentController] linkChild error details:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: error.message });
    }
};

export const unlinkChild = async (req: AuthRequest, res: Response) => {
    try {
        const { parentId, studentId } = req.body;
        if (!(await assertActingOnOwnParentAccount(req, parentId))) {
            return res.status(403).json({ message: 'You may only unlink a child from your own account' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        await ParentService.unlinkChild(req.user.school_id, branchId, parentId, studentId);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const schoolId = req.user.school_id;
        
        console.log('📅 [ParentController] createAppointment called', { schoolId, branchId });
        
        const {
            starts_at, date, title, description, reason,
            teacher_id,
            student_id, student_user_id
        } = req.body;
        const resolvedStudentId = student_id || student_user_id;

        // parent_id is ALWAYS derived from the caller's own session, never trusted
        // from the client — otherwise a parent could book an appointment (or spam
        // teacher slots) under another family's name. Same for student_id: it must
        // be one of the caller's own linked children.
        let ownParentId: string;
        if (isAdmin(req)) {
            const bodyParentId = req.body.parent_id || req.body.requested_by_parent_id;
            if (!bodyParentId) return res.status(400).json({ message: 'parent_id is required' });
            ownParentId = bodyParentId;
        } else {
            const ownParent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!ownParent) return res.status(404).json({ message: 'Parent profile not found' });
            ownParentId = ownParent.id;
        }
        if (resolvedStudentId) {
            await assertParentOwnsStudent(req, resolvedStudentId);
        }

        // Extremely robust date parsing
        const rawDate = starts_at || date || req.body?.starts_at || req.body?.date;
        if (!rawDate) {
            return res.status(400).json({ message: 'Appointment date is required' });
        }

        const appointmentDate = new Date(rawDate);
        if (isNaN(appointmentDate.getTime())) {
            console.error('❌ [ParentController] Invalid date received:', rawDate);
            return res.status(400).json({ message: `Invalid appointment date: ${rawDate}` });
        }

        console.log('📅 [ParentController] Parsed date:', appointmentDate.toISOString());

        // Prepare data for Prisma
        const prismaData = {
            school_id: schoolId,
            branch_id: (branchId && branchId !== 'all') ? branchId : null,
            parent_id: ownParentId,
            teacher_id: teacher_id,
            student_id: resolvedStudentId,
            title: title || `Meeting for Student`,
            description: description || reason || 'No details provided',
            date: appointmentDate,
            status: 'Pending'
        };

        console.log('📅 [ParentController] Prisma data:', JSON.stringify({ ...prismaData, date: prismaData.date.toISOString() }));

        const result = await (prisma as any).appointment.create({
            data: prismaData
        });
        
        res.status(201).json(result);
    } catch (error: any) {
        console.error('🔥 [ParentController] createAppointment Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// The parent's own "History" tab must read from the SAME table createAppointment
// writes to (prisma.appointment) — it was previously wired to the unrelated
// counseling-appointment table/endpoint (GET /counseling), which has no parent_id
// filter at all, so every parent-teacher appointment ever booked silently
// vanished from the booking parent's own history view even though the teacher
// could see and respond to it fine via /teachers/me/appointments.
export const getMyAppointments = async (req: AuthRequest, res: Response) => {
    try {
        let ownParentId: string;
        if (isAdmin(req) && req.query.parent_id) {
            ownParentId = req.query.parent_id as string;
        } else {
            const ownParent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!ownParent) return res.status(404).json({ message: 'Parent profile not found' });
            ownParentId = ownParent.id;
        }

        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const appointments = await (prisma as any).appointment.findMany({
            where: {
                school_id: req.user.school_id,
                parent_id: ownParentId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
            },
            orderBy: { date: 'desc' }
        });
        res.json(appointments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const volunteerSignup = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);

        // parent_id must always be derived from the caller's own session —
        // never trust a client-supplied value, otherwise a parent could sign
        // up for a volunteer slot under another family's name.
        let ownParentId: string | undefined = req.body.parent_id;
        if (!isAdmin(req)) {
            const ownParent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!ownParent) return res.status(404).json({ message: 'Parent profile not found' });
            ownParentId = ownParent.id;
        }

        const result = await ParentService.volunteerSignup(req.user.school_id, branchId, { ...req.body, parent_id: ownParentId });
        res.status(201).json(result);
    } catch (error: any) {
        if (error.message?.includes('23505')) {
            res.status(409).json({ message: 'You have already signed up for this opportunity' });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        // Ownership-checked in the service — a caller may only ever mark THEIR
        // OWN notification read, never another user's by guessing its id.
        const result = await ParentService.markNotificationRead(req.user.school_id, branchId, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getChildOverview = async (req: AuthRequest, res: Response) => {
    try {
        await assertParentOwnsStudent(req, req.params.studentId as string);
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getChildOverview(req.user.school_id, branchId, req.params.studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(error.message === 'Student not found' ? 404 : 500).json({ message: error.message });
    }
};

export const getStudentFees = async (req: AuthRequest, res: Response) => {
    try {
        await assertParentOwnsStudent(req, req.params.studentId as string);
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getStudentFees(req.user.school_id, branchId, req.params.studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(error.message === 'Student not found' ? 404 : 500).json({ message: error.message });
    }
};

export const recordPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { student_id, reference, gateway } = req.body;
        if (!student_id) return res.status(400).json({ message: 'student_id is required' });
        await assertParentOwnsStudent(req, student_id);

        // Never trust a client-supplied amount/status for a payment — verify the
        // reference against the real gateway (same check used in
        // transaction.controller.ts) and only record what the gateway confirms.
        if (!reference || !gateway) {
            return res.status(400).json({ message: 'A verified gateway reference is required to record a payment' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const verified = await TransactionService.verifyPayment(req.user.school_id, branchId, reference, gateway);
        if (!verified || (verified as any).status !== 'success') {
            return res.status(402).json({ message: 'Payment could not be verified with the gateway' });
        }

        const result = await ParentService.recordPayment(req.user.school_id, branchId, {
            ...req.body,
            student_id,
            amount: (verified as any).amount,
        });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(error.message === 'Student not found' ? 404 : 500).json({ message: error.message });
    }
};

export const getPTAMeetings = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getPTAMeetings(req.user.school_id, branchId, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLearningResources = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getLearningResources(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getParentMessages = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ParentService.getParentMessages(req.user.school_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { receiverId, content } = req.body;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ParentService.sendMessage(req.user.school_id, branchId, req.user.id, receiverId, content);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getNotifications(req.user.school_id, branchId, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getVolunteeringOpportunities = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getVolunteeringOpportunities(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getComplaints = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ParentService.getComplaints(req.user.school_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createComplaint = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ParentService.createComplaint(req.user.school_id, req.user.id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getParentTodayUpdate = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.query.studentId as string;
        const result = await ParentService.getParentTodayUpdate(req.user.school_id, req.user.id, studentId);
        res.json(result);
    } catch (error: any) {
        console.error('❌ [ParentController] getParentTodayUpdate error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getTeacherAvailability = async (req: AuthRequest, res: Response) => {
    try {
        const { teacherId } = req.params;
        const rawDate = (req.query.date as string | undefined) || new Date().toISOString();
        const date = new Date(rawDate);
        const result = await ParentService.getTeacherAvailability(req.user.school_id, teacherId as string, date);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

