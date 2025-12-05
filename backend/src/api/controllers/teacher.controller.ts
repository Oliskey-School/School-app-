
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getClasses = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.id;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });
        
        // In a real app, logic would derive class objects from the strings
        res.json({ classes: teacher.classes });
    } catch (error) {
        res.status(500).json({ message: "Error" });
    }
};

export const getStudents = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.id;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        // Fetch students belonging to classes taught by this teacher
        // Parsing "10A" to grade: 10, section: "A"
        const students = await prisma.student.findMany({
            where: {
                // Simplified logic for demo. Real apps use many-to-many class relations
                grade: 10 
            },
            include: { user: true }
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Error fetching students" });
    }
};

export const createAssignment = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.id;
    const { title, description, className, subject, dueDate } = req.body;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) return res.status(404).json({ message: "Teacher not found" });

        const assignment = await prisma.assignment.create({
            data: {
                teacherId: teacher.id,
                title,
                description,
                className,
                subject,
                dueDate: new Date(dueDate)
            }
        });
        res.status(201).json(assignment);
    } catch (error) {
        res.status(500).json({ message: "Error creating assignment" });
    }
};

export const getAssignments = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.id;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        const assignments = await prisma.assignment.findMany({
            where: { teacherId: teacher?.id },
            include: { submissions: true }
        });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching assignments" });
    }
};

export const markAttendance = async (req: Request, res: Response) => {
    const { studentIds, status, date } = req.body; // Expects array of student IDs
    try {
        const updates = studentIds.map((sid: number) => 
            prisma.attendance.create({
                data: {
                    studentId: sid,
                    status: status,
                    date: new Date(date)
                }
            })
        );
        await Promise.all(updates);
        res.json({ message: "Attendance marked" });
    } catch (error) {
        res.status(500).json({ message: "Error marking attendance" });
    }
};
