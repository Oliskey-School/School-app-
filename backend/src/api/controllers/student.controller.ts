
import { Request, Response } from 'express';
import * as StudentService from '../services/student.service';

export const getAllStudents = async (req: Request, res: Response) => {
    try {
        const students = await StudentService.findAllStudents();
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
};

export const getStudentById = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    try {
        const student = await StudentService.findStudentById(id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student' });
    }
};
