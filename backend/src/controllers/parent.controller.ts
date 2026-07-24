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
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can list parents by class' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ParentService.getParentsByClassId((req.user.school_id as string), branchId, (req.params.classId as string));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createParent = async (req: AuthRequest, res: Response) => {
    console.log('📡 [ParentController] createParent called with body:', JSON.stringify(req.body));
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


export const linkChild = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can link a child to a parent' });
        const { parentId, studentId } = req.body;
        console.log('📡 [ParentController] linkChild called with:', { parentId, studentId, body: req.body });

        if (!parentId || !studentId) {
            return res.status(400).json({ message: 'parentId and studentId are required' });
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
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can unlink a child from a parent' });
        const { parentId, studentId } = req.body;
        const branchId = req.user.branch_id || req.body?.branch_id;
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
        
        console.log('📅 [ParentController] createAppointment body:', JSON.stringify(req.body));
        
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

export const volunteerSignup = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await ParentService.volunteerSignup(req.user.school_id, branchId, req.body);
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
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await ParentService.markNotificationRead(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getChildOverview = async (req: AuthRequest, res: Response) => {
    try {
        await assertParentOwnsStudent(req, req.params.studentId as string);
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await ParentService.getChildOverview(req.user.school_id, branchId, req.params.studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(error.message === 'Student not found' ? 404 : 500).json({ message: error.message });
    }
};

export const getStudentFees = async (req: AuthRequest, res: Response) => {
    try {
        await assertParentOwnsStudent(req, req.params.studentId as string);
        const branchId = req.user.branch_id || (req.query.branchId as string);
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
        const branchId = req.user.branch_id || req.body.branch_id;
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
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await ParentService.getPTAMeetings(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getLearningResources = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
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
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await ParentService.sendMessage(req.user.school_id, branchId, req.user.id, receiverId, content);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await ParentService.getNotifications(req.user.school_id, branchId, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getVolunteeringOpportunities = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
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

