import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { StudentService } from '../services/student.service';
import { ExtracurricularService } from '../services/extracurricular.service';
import { SubjectService } from '../services/subject.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';

export const enrollStudent = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        if (!schoolId) {
            return res.status(400).json({ message: 'School ID is required' });
        }

        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.enrollStudent(schoolId, branchId, req.body, req.user.role);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Enrollment controller error:', error);
        if (error.message.includes('required for enrollment')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('User already registered') || error.message.includes('Auth creation failed')) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const approveStudent = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
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
        
        // If teacher, StudentService.getAllStudents already handles filtering by school.
        // We could add more specific teacher-class filtering in StudentService if needed.
        const result = await StudentService.getAllStudents(req.user.school_id, branchId, classId);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const getStudentById = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await StudentService.getStudentById(req.user.school_id, branchId, req.params.id as string);
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
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.updateStudent(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
    try {
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
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        await StudentService.deleteStudent(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const result = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyPerformance = async (req: AuthRequest, res: Response) => {
    try {
        // We need to find the student ID first
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getPerformance(req.user.school_id, req.user.branch_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await StudentService.getPerformance(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentBehaviorNotes = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const result = await StudentService.getBehaviorNotes(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyQuizResults = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getQuizResults(req.user.school_id, req.user.branch_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMySubmissions = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getStudentSubmissions(req.user.school_id, req.user.branch_id, student.id);
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
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getReportCards(req.user.school_id, req.user.branch_id, student.id);
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
        
        // Find Student
        const student = await prisma.student.findFirst({ where: { school_generated_id: studentCode, school_id: schoolId } });
        if (!student) return res.status(404).json({ message: 'Student with provided code not found.' });

        // Resolve Parent ID: Use provided parentId (Admin case) or current user's parent profile (Parent case)
        let resolvedParentId = parentId;
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

        let resolvedParentId = parentId;
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
        const { classId } = req.body;
        if (!classId) return res.status(400).json({ message: 'Class ID is required' });

        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.assignStudentToClass(req.user.school_id, branchId, req.params.id as string, classId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const removeStudentFromClass = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await StudentService.removeStudentFromClass(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyStats = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getStudentStats(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyAchievements = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
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
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getDashboardOverview(req.user.school_id, student.id, req.user.branch_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await AttendanceService.getAttendanceByStudent(req.user.school_id, req.user.branch_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMySubjects = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getMySubjects(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyActivities = async (req: AuthRequest, res: Response) => {
    try {
        const student = await StudentService.getStudentProfileByUserId(req.user.school_id, req.user.branch_id, req.user.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const result = await StudentService.getMyActivities(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getStudentsByClass = async (req: AuthRequest, res: Response) => {
    try {
        const grade = parseInt(req.query.grade as string);
        const section = req.query.section as string;
        const schoolId = req.query.schoolId as string || req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.query.branchId as string);
        const curriculumId = req.query.curriculumId as string;

        if (isNaN(grade) || !section) {
            return res.status(400).json({ message: 'Grade and section are required' });
        }

        const students = await StudentService.getStudentsByClass(schoolId, branchId, grade, section, curriculumId);
        res.json(students);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
