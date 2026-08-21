import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TeacherService } from '../services/teacher.service';
import prisma from '../config/database'; // Added prisma if needed, but the controller mainly uses TeacherService
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

export const createTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create teachers' });
        // Pass the RAW X-Branch-Id header explicitly (top priority) so a new teacher
        // is ALWAYS created in the branch the admin is actively viewing — never the
        // home/Main branch — regardless of any branch value the form posts.
        const headerBranch = (req.headers['x-branch-id'] as string) || undefined;
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id, headerBranch);
        console.log(`[createTeacher] header=${headerBranch} body.branch_id=${req.body?.branch_id} active=${req.user?.active_branch_id} -> resolved=${branchId}`);
        const result = await TeacherService.createTeacher(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const result: any = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
        if (!result) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }
        // Show only classes assigned for the teacher's ACTIVE branch.
        // Classes with null branch_id are school-wide and always visible.
        // Strictly excluding other branches' classes is what gives each branch
        // its own isolated class environment — a Lekki admin assigns Lekki classes
        // to the teacher and only those appear when the teacher switches to Lekki.
        if (Array.isArray(result.classes)) {
            const branchId = getEffectiveBranchId(req.user, undefined);
            if (branchId && branchId !== 'all') {
                result.classes = result.classes.filter((ct: any) => {
                    const ab: string | null = ct?.branch_id ?? null;
                    return ab === null || ab === branchId;
                });
            }
        }
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getAllTeachers = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user.role === 'TEACHER') {
            const result = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
            return res.json(result ? [result] : []);
        }

        // Full staff directory (every teacher's linked user record — email,
        // certificates, compliance documents) is admin/proprietor territory.
        // PARENT is allowed too: AppointmentScreen needs it to populate the
        // "book with" teacher picker. No other role has a legitimate caller —
        // in particular a STUDENT has no reason to list every teacher's full
        // record, so this was previously an open read for any authenticated role.
        const roleLower = (req.user.role || '').toLowerCase();
        if (!isAdmin(req) && roleLower !== 'parent') {
            return res.status(403).json({ message: 'You do not have access to the full teacher directory' });
        }

        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const result = await TeacherService.getAllTeachers(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getTeacherById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await TeacherService.getTeacherById(req.user.school_id, branchId, req.params.id as string);
        if (!result) return res.status(404).json({ message: 'Teacher not found' });
        // Only an admin, or the teacher viewing their own record, may see this —
        // it includes the full linked user record (initial_password among it),
        // so any other teacher requesting another teacher's id must be blocked.
        if (!isAdmin(req) && result.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have access to this teacher record' });
        }
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

// A teacher may change only these on their OWN record. Everything else on the
// teacher model (status, salary, classes, school_generated_id, …) stays
// admin-only. Mirrors SELF_UPDATABLE_STUDENT_FIELDS in student.controller.ts.
// subject_specialty is the teacher's own descriptive specialisation, shown on
// their profile. It is NOT an authorization boundary: the one place it affects
// data (getStudentPerformance) only NARROWS results, applies solely when no
// ?subject= is supplied, and sits behind assertCanViewStudent — a teacher can
// already override it with a query param. So self-editing grants no new access.
const SELF_UPDATABLE_TEACHER_FIELDS = ['notification_preferences', 'subject_specialty'];

export const updateTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            // The Notification Settings screen PUTs the teacher's own record, so
            // an unconditional admin gate made that screen silently fail with a
            // 403 the UI only logged to the console — the toggle flipped and
            // snapped back. Allow a teacher through for their OWN row when the
            // body touches nothing but the self-editable allowlist.
            const bodyKeys = Object.keys(req.body || {}).filter(k => k !== 'branch_id');
            const isSelfSettingsUpdate =
                (req.user.role || '').toUpperCase() === 'TEACHER' &&
                bodyKeys.length > 0 &&
                bodyKeys.every(k => SELF_UPDATABLE_TEACHER_FIELDS.includes(k));

            const ownTeacher = isSelfSettingsUpdate
                ? await prisma.teacher.findFirst({
                    where: { user_id: req.user.id, school_id: req.user.school_id },
                    select: { id: true }
                })
                : null;

            if (!ownTeacher || ownTeacher.id !== req.params.id) {
                return res.status(403).json({ message: 'Only admins can update teacher records' });
            }
        }
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await TeacherService.updateTeacher(req.user.school_id, branchId, req.params.id as string, req.body, req.user);
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

// Branch admin assigns a (lent) teacher to classes/subjects in THEIR branch only.
export const assignTeacherBranchClasses = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can assign teacher branch classes' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await TeacherService.assignBranchClasses(req.user.school_id, branchId, req.params.id as string, req.body?.classes || [], req.user);
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const deleteTeacher = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete teachers' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId as string) || req.body?.branch_id);
        await TeacherService.deleteTeacher(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const submitMyAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const result = await TeacherService.submitMyAttendance(req.user.school_id, branchId, req.user.id);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getMyHistory = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const limit = parseInt(req.query.limit as string) || 30;
        const result = await TeacherService.getMyAttendanceHistory(req.user.school_id, branchId, req.user.id, limit);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getTeacherAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id as string) || (req.query.branchId as string));
        const filters = {
            date: req.query.date as string,
            status: req.query.status as string,
            teacher_id: (req.query.teacher_id as string) || (req.query.teacherId as string),
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string
        };
        const result = await TeacherService.getTeacherAttendance(req.user.school_id, branchId, filters);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const saveTeacherAttendance = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can record teacher attendance' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const { records } = req.body;
        const result = await TeacherService.saveTeacherAttendance(req.user.school_id, branchId, records);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const approveTeacherAttendance = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can approve teacher attendance' });
        const { status } = req.body;
        const result = await TeacherService.approveTeacherAttendance(req.user.school_id, req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getMyStudentsWithCredentials = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }

        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await TeacherService.getStudentsWithCredentials(req.user.school_id, branchId, teacher.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getPendingStudents = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await TeacherService.getPendingStudentsForSchool(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};
export const getMyAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
        if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

        const branchId = getEffectiveBranchId(req.user);
        const result = await TeacherService.getTeacherAppointments(req.user.school_id, branchId, teacher.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const updateMyAppointmentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const teacher = await TeacherService.getTeacherProfileByUserId(req.user.school_id, req.user.id);
        if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
        const result = await TeacherService.updateAppointmentStatus(req.user.school_id, teacher.id, req.params.id as string, status);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getMyBadges = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherBadges(req.user.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getMyRecognitions = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getTeacherRecognitions(req.user.school_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getMyMentoring = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.getMentoringMatches(req.user.school_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const createMyMentoring = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.createMentoringMatch(req.user.id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getTeacherCertificates = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const teacher = await TeacherService.getTeacherById(req.user.school_id, branchId, req.params.id as string);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        if (!isAdmin(req) && teacher.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have access to this teacher record' });
        }
        const result = await TeacherService.getTeacherCertificates(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getSubstituteRequests = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await TeacherService.getSubstituteRequests(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const createSubstituteRequest = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TeacherService.createSubstituteRequest(req.user.school_id, req.user.id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getTeacherEvaluation = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const teacher = await TeacherService.getTeacherById(req.user.school_id, branchId, req.params.id as string);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        if (!isAdmin(req) && teacher.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have access to this teacher\'s evaluation' });
        }
        const result = await TeacherService.getTeacherEvaluation(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const submitTeacherEvaluation = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can submit teacher evaluations' });
        const result = await TeacherService.submitTeacherEvaluation(req.user.school_id, req.params.id as string, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};

export const getTeacherPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const teacher = await TeacherService.getTeacherById(req.user.school_id, branchId, req.params.id as string);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        if (!isAdmin(req) && teacher.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You do not have access to this teacher\'s performance data' });
        }
        const result = await TeacherService.getTeacherPerformance(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'teacher.controller.ts');
    }
};


