
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new CBT Test (with mock Excel upload logic)
export const createTest = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherUserId = req.user.id;
    const { title, type, className, subject, duration, questions } = req.body;

    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUserId } });
        if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });

        const test = await prisma.cBTTest.create({
            data: {
                teacherId: teacher.id,
                title,
                type,
                className,
                subject,
                duration,
                questionsCount: questions.length,
                questions: {
                    create: questions // Expecting array of { text, options, correctAnswer }
                }
            },
            include: { questions: true }
        });

        res.status(201).json(test);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create test" });
    }
};

export const getTestsByTeacher = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherUserId = req.user.id;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUserId } });
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        const tests = await prisma.cBTTest.findMany({
            where: { teacherId: teacher.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching tests" });
    }
};

export const togglePublishTest = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const test = await prisma.cBTTest.findUnique({ where: { id: parseInt(id) } });
        if (!test) return res.status(404).json({ message: "Test not found" });

        const updated = await prisma.cBTTest.update({
            where: { id: parseInt(id) },
            data: { isPublished: !test.isPublished }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error updating test" });
    }
};

export const deleteTest = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Delete related questions and results first (cascade usually handles this in DB, but explicit here for safety)
        await prisma.cBTQuestion.deleteMany({ where: { testId: parseInt(id) } });
        await prisma.cBTResult.deleteMany({ where: { testId: parseInt(id) } });
        await prisma.cBTTest.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Test deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting test" });
    }
};

export const getAvailableTests = async (req: Request, res: Response) => {
    // @ts-ignore
    const studentUserId = req.user.id;
    try {
        const student = await prisma.student.findUnique({ where: { userId: studentUserId } });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const studentClass = `${student.grade}${student.section}`;
        const classNameStr = `Grade ${studentClass}`; // Matching mock format "Grade 10A"

        const tests = await prisma.cBTTest.findMany({
            where: {
                isPublished: true,
                OR: [
                    { className: classNameStr },
                    { className: "All" }
                ]
            },
            include: {
                questions: true, // Include questions so student can take it
                results: {
                    where: { studentId: student.id } // Include existing result if any
                }
            }
        });
        res.json(tests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching available tests" });
    }
};

export const submitTest = async (req: Request, res: Response) => {
    // @ts-ignore
    const studentUserId = req.user.id;
    const { id } = req.params;
    const { score, total, percentage } = req.body;

    try {
        const student = await prisma.student.findUnique({ where: { userId: studentUserId } });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const result = await prisma.cBTResult.create({
            data: {
                testId: parseInt(id),
                studentId: student.id,
                score,
                total,
                percentage
            }
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error submitting test" });
    }
};

export const getTestResults = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const results = await prisma.cBTResult.findMany({
            where: { testId: parseInt(id) },
            include: {
                student: {
                    include: { user: true }
                }
            }
        });
        
        // Transform for frontend
        const formattedResults = results.map(r => ({
            studentId: r.studentId,
            studentName: r.student.user.name,
            score: r.score,
            totalQuestions: r.total,
            percentage: r.percentage,
            submittedAt: r.submittedAt
        }));

        res.json(formattedResults);
    } catch (error) {
        res.status(500).json({ message: "Error fetching results" });
    }
};
