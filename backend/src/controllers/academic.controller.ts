import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AcademicService } from '../services/academic.service';
import prisma from '../config/database';

export const saveGrade = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, subject, term, score, session } = req.body;

        if (req.user.role === 'teacher') {
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

        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await AcademicService.saveGrade(req.user.school_id, branchId, studentId, subject, term, score, session);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds, subject, term } = req.body;

        if (req.user.role === 'teacher') {
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

        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await AcademicService.getGrades(req.user.school_id, branchId, studentIds, subject, term);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = (req.query.school_id as string) || req.user.school_id;
        const branchId = (req.query.branch_id as string) || req.user.branch_id;

        const result = await AcademicService.getSubjects(schoolId, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = (req.query.schoolId as string) || req.user.school_id;
        const branchId = (req.query.branchId as string) || req.user.branch_id;
        const term = req.query.term as string;
        const classId = req.query.classId ? req.query.classId as string : null;

        const result = await AcademicService.getAnalytics(schoolId, branchId, term, classId ? parseInt(classId) : null);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = (req.query.schoolId as string) || req.user.school_id;
        const branchId = (req.query.branchId as string) || req.user.branch_id;
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
        const { studentId, schoolId, ...data } = req.body;
        const finalSchoolId = schoolId || req.user.school_id;

        const result = await AcademicService.upsertReportCard(studentId as string, finalSchoolId, data);
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
        const result = await AcademicService.getCurriculumTopics(subjectId as string, term as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const syncCurriculumData = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, source } = req.body;
        if (!subjectId) {
            return res.status(400).json({ message: 'subjectId is required' });
        }
        const result = await AcademicService.syncCurriculumData(subjectId, source);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
