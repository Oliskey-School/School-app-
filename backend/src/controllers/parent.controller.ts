import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ParentService } from '../services/parent.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getParents = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ParentService.getParents(req.user.school_id, branchId);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getParentsByClassId = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await ParentService.getParentsByClassId((req.user.school_id as string), branchId, (req.params.classId as string));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createParent = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ParentService.createParent(req.user.school_id, branchId, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getParentById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await ParentService.getParentById(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateParent = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ParentService.updateParent(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteParent = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id || (req.query.branchId as string));
        await ParentService.deleteParent(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ message: error.message });
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
        
        const result = await ParentService.getChildren(req.user.school_id, branchId, parent.user_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const linkChild = async (req: AuthRequest, res: Response) => {
    try {
        const { parentId, studentId } = req.body;
        console.log('📡 [ParentController] linkChild called with:', { parentId, studentId });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ParentService.linkChild(req.user.school_id, branchId, parentId, studentId);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('❌ [ParentController] linkChild error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

export const unlinkChild = async (req: AuthRequest, res: Response) => {
    try {
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
            parent_id, requested_by_parent_id,
            teacher_id,
            student_id, student_user_id
        } = req.body;

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
            parent_id: parent_id || requested_by_parent_id,
            teacher_id: teacher_id,
            student_id: student_id || student_user_id,
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
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await ParentService.getChildOverview(req.user.school_id, branchId, req.params.studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentFees = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || (req.query.branchId as string);
        const result = await ParentService.getStudentFees(req.user.school_id, branchId, req.params.studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const recordPayment = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await ParentService.recordPayment(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
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
        const rawDate = (req.query.date as string) || (new Date().toISOString());
        const date = new Date(rawDate);
        const result = await ParentService.getTeacherAvailability(req.user.school_id, teacherId, date);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getParentChildren = async (req: AuthRequest, res: Response) => {
    try {
        const { student_id, parent_id } = req.query;
        const where: any = {
            school_id: req.user.school_id
        };

        // Handle both JS undefined/null and literal "undefined"/"null" strings from frontend
        if (student_id && student_id !== 'undefined' && student_id !== 'null') {
            where.student_id = student_id;
        }
        if (parent_id && parent_id !== 'undefined' && parent_id !== 'null') {
            where.parent_id = parent_id;
        }

        console.log('🔍 [ParentController] getParentChildren query:', where);
        const result = await prisma.parentChild.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        school_generated_id: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        full_name: true,
                        school_generated_id: true
                    }
                }
            }
        });

        res.json(result);
    } catch (error: any) {
        console.error('🔥 [ParentController] getParentChildren Error:', error);
        res.status(500).json({ message: error.message });
    }
};
