import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { StudentService } from '../services/student.service';
import { IdGeneratorService } from '../services/idGenerator.service';
import { ExtracurricularService } from '../services/extracurricular.service';
import { SubjectService } from '../services/subject.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// A student may only view their OWN record; a parent only their linked
// children. Teachers/admins keep their existing school/branch-scoped access
// (already enforced by getEffectiveBranchId + StudentService's school_id
// filter) — this only closes the student-to-student and parent-to-other-child
// IDOR gap, not the accepted teacher/admin path.
async function assertCanViewStudent(req: AuthRequest, studentId: string): Promise<boolean> {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        return !!student && student.id === studentId;
    }
    if (role === 'PARENT') {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return false;
        const link = await prisma.parentChild.findFirst({ where: { parent_id: parent.id, student_id: studentId }, select: { id: true } });
        return !!link;
    }
    return true; // TEACHER/ADMIN/other staff — unchanged from existing behavior
}

export const getNextAdmissionNumber = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        if (!schoolId) {
            return res.status(400).json({ message: 'School ID is required' });
        }
        const admissionNumber = await IdGeneratorService.generateAdmissionNumber(schoolId);
        res.json({ admissionNumber });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const enrollStudent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can enroll students' });
        const schoolId = req.user.school_id;
        if (!schoolId) {
            return res.status(400).json({ message: 'School ID is required' });
        }

        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await StudentService.enrollStudent(schoolId, branchId, req.body, req.user.role, req.user.id);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Enrollment controller error:', error);
        if (error.message.includes('required for enrollment')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('User already registered') || error.message.includes('Auth creation failed')) {
            return res.status(409).json({ message: error.message });
        }
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const approveStudent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can approve students' });
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await StudentService.approveStudent(schoolId, branchId, req.params.id as string);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('Approve student error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllStudents = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const classId = (req.query.class_id as string) || (req.query.classId as string);
        const status = req.query.status as string;
        
        console.log(`[DEBUG] getAllStudents (GET /): schoolId=${req.user.school_id}, branchId=${branchId}, classId=${classId}, status=${status}`);

        const result = await StudentService.getAllStudents(req.user.school_id, branchId, classId, status);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const getStudentById = async (req: AuthRequest, res: Response) => {
    try {
        if (!(await assertCanViewStudent(req, req.params.id as string))) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await StudentService.getStudentById(req.user.school_id, branchId, req.params.id as string);
        if (!result) {
            // Not found OR outside the caller's school/branch — never reveal which.
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentByStudentId = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string || req.query.branch_id as string);
        const result = await StudentService.getStudentByStudentId(req.user.school_id, branchId, req.params.studentId as string);
        if (!result) return res.status(404).json({ message: 'Student not found' });
        if (!(await assertCanViewStudent(req, (result as any).id))) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Fields a student may update on their OWN record — gamification progress
// only. Everything else (grades, attendance flags, class/branch assignment,
// status, etc.) stays admin-only; a request containing any other key is
// rejected outright, not silently filtered, so this can't be widened by
// accident.
const SELF_UPDATABLE_STUDENT_FIELDS = ['xp', 'level'];

export const updateStudent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            const role = (req.user.role || '').toUpperCase();
            const bodyKeys = Object.keys(req.body || {});
            const isSelfGamificationUpdate =
                role === 'STUDENT' &&
                bodyKeys.length > 0 &&
                bodyKeys.every(k => SELF_UPDATABLE_STUDENT_FIELDS.includes(k));

            if (!isSelfGamificationUpdate || !(await assertCanViewStudent(req, req.params.id as string))) {
                return res.status(403).json({ message: 'Only admins can update student records' });
            }
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.updateStudent(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can bulk-update student status' });
        const { ids, status, branch_id } = req.body;
        if (!Array.isArray(ids) || !status) {
            return res.status(400).json({ message: 'IDs array and status are required' });
        }
        const branchId = getEffectiveBranchId(req.user, branch_id);
        const result = await StudentService.bulkUpdateStatus(req.user.school_id, branchId, ids, status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete students' });
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id || (req.query.branchId as string));
        await StudentService.deleteStudent(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const result = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        // We need to find the student ID first
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // If user is a teacher, they might only want to see their subjects, 
        // but for a student viewing their OWN profile, we show everything.
        // Role check is important here.
        const result = await StudentService.getPerformance(req.user.school_id, branchId, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentPerformance = async (req: AuthRequest, res: Response) => {
    try {
        if (!(await assertCanViewStudent(req, req.params.id as string))) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const role = req.user.role;
        let subjectFilter: string | string[] | undefined = req.query.subject as string;

        // If the requester is a TEACHER, restrict to their subjects unless they are viewing a specific subject
        if (role === 'TEACHER' && !subjectFilter) {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id }
            });
            if (teacher && teacher.subject_specialty && teacher.subject_specialty.length > 0) {
                subjectFilter = teacher.subject_specialty;
            }
        }

        const result = await StudentService.getPerformance(req.user.school_id, branchId, req.params.id as string, subjectFilter);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentBehaviorNotes = async (req: AuthRequest, res: Response) => {
    try {
        if (!(await assertCanViewStudent(req, req.params.id as string))) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await StudentService.getBehaviorNotes(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyQuizResults = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getQuizResults(req.user.school_id, branchId, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMySubmissions = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getStudentSubmissions(req.user.school_id, branchId, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyFees = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getStudentFees(req.user.school_id, req.user.branch_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyReportCards = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getReportCards(req.user.school_id, branchId, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const linkGuardian = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branchId || req.body.branch_id);
        const { studentCode, parentId } = req.body;
        const admin = isAdmin(req);
        const role = (req.user.role || '').toUpperCase();

        // Only an admin may link an ARBITRARY parent to a student (parentId supplied
        // in the body). Anyone else — including a student, who has no business
        // calling this at all — must be a PARENT linking their OWN parent profile.
        // Without this check any authenticated student could pass any parentId +
        // any other student's code and grant that parent full read access to a
        // child that isn't theirs.
        if (!admin) {
            if (role !== 'PARENT') {
                return res.status(403).json({ message: 'Only admins or parents can link a guardian' });
            }
            if (parentId) {
                return res.status(403).json({ message: 'Only admins can link an arbitrary parent' });
            }
        }

        // Find Student
        const student = await prisma.student.findFirst({ where: { school_generated_id: studentCode, school_id: schoolId } });
        if (!student) return res.status(404).json({ message: 'Student with provided code not found.' });

        // Resolve Parent ID: Use provided parentId (Admin case) or current user's parent profile (Parent case)
        let resolvedParentId = admin ? parentId : undefined;
        if (!resolvedParentId) {
            const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id } });
            if (!parent) return res.status(404).json({ message: 'Parent profile not found.' });
            resolvedParentId = parent.id;
        }

        const result = await StudentService.linkGuardian(schoolId, branchId, {
            studentId: student.id,
            parentId: resolvedParentId
        });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const unlinkGuardian = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branchId || req.body.branch_id);
        const { studentId, parentId } = req.body;
        const admin = isAdmin(req);
        const role = (req.user.role || '').toUpperCase();

        // Same guard as linkGuardian: only an admin may unlink an ARBITRARY
        // parent/student pair. Anyone else must be a PARENT unlinking their own
        // profile — otherwise a student could sever another child's legitimate
        // parent link by guessing/enumerating IDs.
        if (!admin) {
            if (role !== 'PARENT') {
                return res.status(403).json({ message: 'Only admins or parents can unlink a guardian' });
            }
            if (parentId) {
                return res.status(403).json({ message: 'Only admins can unlink an arbitrary parent' });
            }
        }

        let resolvedParentId = admin ? parentId : undefined;
        if (!resolvedParentId) {
            const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id } });
            if (parent) resolvedParentId = parent.id;
        }

        if (!resolvedParentId || !studentId) {
             return res.status(400).json({ message: 'Missing studentId or parentId.' });
        }

        const result = await StudentService.unlinkGuardian(schoolId, branchId, {
            studentId,
            parentId: resolvedParentId
        });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const assignStudentToClass = async (req: AuthRequest, res: Response) => {
    try {
        // Admin-only: this reassigns ANY student (by path param id, no ownership
        // check) to a class. Without this gate any authenticated student could
        // move any other student between classes by ID.
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can assign students to a class' });
        const { classId, classIds } = req.body;
        const studentId = req.params.id as string;
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);

        if (classIds && Array.isArray(classIds)) {
            // Handle multiple assignments
            const results = [];
            for (const cId of classIds) {
                results.push(await StudentService.assignStudentToClass(schoolId, branchId, studentId, cId));
            }
            return res.json(results);
        }

        if (!classId) return res.status(400).json({ message: 'Class ID or Class IDs array is required' });

        const result = await StudentService.assignStudentToClass(schoolId, branchId, studentId, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const removeStudentFromClass = async (req: AuthRequest, res: Response) => {
    try {
        // Same gate as assignStudentToClass — no ownership check exists on this
        // endpoint otherwise, so any student could pull any other student out of
        // their class by ID.
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can remove students from a class' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const classId = req.body.class_id || req.body.classId || undefined;
        const result = await StudentService.removeStudentFromClass(req.user.school_id, branchId, req.params.id as string, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyStats = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getStudentStats(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyAchievements = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getStudentAchievements(student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
import { AttendanceService } from '../services/attendance.service';

export const getMyDashboardOverview = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getDashboardOverview(req.user.school_id, student.id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await AttendanceService.getAttendanceByStudent(req.user.school_id, branchId, student.id);
        res.json(result);
    } catch (error: any) {
        // Non-students (e.g. a parent) hitting a student "me" endpoint get a
        // clean 403 from the service — honor it instead of masking as a 500.
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const getMySubjects = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getMySubjects(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const getMyActivities = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getMyActivities(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const getStudentsByClass = async (req: AuthRequest, res: Response) => {
    try {
        const grade = parseInt(req.query.grade as string);
        const section = req.query.section as string;
        // Always trust the verified token's school_id — never a client-supplied
        // query param, which would let any authenticated user pull another
        // school's roster by passing ?schoolId=<other-school-id>.
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const curriculumId = req.query.curriculumId as string;

        if (isNaN(grade) || !section) {
            return res.status(400).json({ message: 'Grade and section are required' });
        }

        // A teacher may only pull the roster of a class they are actually
        // assigned to — otherwise any teacher could enumerate grade/section
        // and read another teacher's full class list.
        if ((req.user.role || '').toUpperCase() === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!teacher) return res.json([]);
            const classRecord = await prisma.class.findFirst({
                where: {
                    school_id: schoolId,
                    ...(branchId && branchId !== 'all' ? { OR: [{ branch_id: branchId }, { branch_id: null }] } : {}),
                    grade,
                    section
                },
                select: { id: true }
            });
            if (!classRecord) return res.json([]);
            const access = await prisma.classTeacher.findFirst({ where: { teacher_id: teacher.id, class_id: classRecord.id } });
            if (!access) return res.status(403).json({ message: 'Unauthorized access to this class' });
        }

        const students = await StudentService.getStudentsByClass(schoolId, branchId, grade, section, curriculumId);
        res.json(students);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPendingApprovals = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const result = await StudentService.getPendingStudentsForSchool(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentsByClassId = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId as any) || (req.query.branch_id as any));
        const classId = req.params.classId as string;
        const status = (req.query.status as string) || 'all';

        // A teacher may only pull the roster of a class they are actually
        // assigned to — otherwise any teacher could pass any classId and read
        // another teacher's full class list.
        if ((req.user.role || '').toUpperCase() === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
            if (!teacher) return res.json([]);
            const access = await prisma.classTeacher.findFirst({ where: { teacher_id: teacher.id, class_id: classId } });
            if (!access) return res.status(403).json({ message: 'Unauthorized access to this class' });
        }

        console.log(`[DEBUG] getStudentsByClassId: schoolId=${schoolId}, branchId=${branchId}, classId=${classId}`);

        const students = await StudentService.getAllStudents(schoolId as any, branchId as any, classId as any, status as any);
        res.json(students);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getStudentSubjects = async (req: AuthRequest, res: Response) => {
    try {
        if (!(await assertCanViewStudent(req, req.params.id as string))) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const schoolId = req.user.school_id as string;
        const studentId = req.params.id as string;
        const result = await StudentService.getStudentSubjects(schoolId, studentId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getStudentDocuments(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const addMyDocument = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user);
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.addStudentDocument(req.user.school_id, student.id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentsBySubject = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId } = req.params;

        // A student may only pull the roster for a subject they are actually
        // enrolled in — otherwise any student could enumerate subjectIds and read
        // the classmate roster (names/avatars/IDs) of every class in the school,
        // not just their own.
        if ((req.user.role || '').toUpperCase() === 'STUDENT') {
            const branchId = getEffectiveBranchId(req.user);
            const student = await StudentService.getStudentProfileByUserId(req.user.school_id, branchId, req.user.id);
            if (!student) return res.status(404).json({ message: 'Student not found' });
            const mySubjects = await StudentService.getMySubjects(req.user.school_id, student.id);
            const owns = (mySubjects || []).some((s: any) => s.id === subjectId);
            if (!owns) return res.status(403).json({ message: 'Not enrolled in this subject' });
        }

        const result = await StudentService.getStudentsBySubject(req.user.school_id, subjectId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const withdrawStudent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can withdraw students' });
        const { reason, effectiveDate } = req.body;
        if (!reason || !effectiveDate) {
            return res.status(400).json({ message: 'reason and effectiveDate are required' });
        }
        const result = await StudentService.withdrawStudent(
            req.user.school_id,
            req.params.id as string,
            reason,
            effectiveDate
        );
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const promoteStudent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can promote students' });
        const { newGrade, newSection, branchId, session, term } = req.body;
        if (newGrade === undefined || !newSection) {
            return res.status(400).json({ message: 'newGrade and newSection are required' });
        }
        const effectiveBranchId = getEffectiveBranchId(req.user, branchId);
        const result = await StudentService.promoteStudent(
            req.user.school_id,
            req.params.id as string,
            Number(newGrade),
            newSection,
            effectiveBranchId,
            session,
            term
        );
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
