import { Request, Response } from 'express';
import { BehaviorService } from '../services/behavior.service';

export const getBehaviorNotes = async (req: any, res: Response) => {
    try {
        const { schoolId, branchId } = req.query;
        const notes = await BehaviorService.getNotesBySchool(
            schoolId as string || req.user.school_id, 
            branchId as string
        );
        res.json(notes);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBehaviorNote = async (req: any, res: Response) => {
    try {
        const { schoolId, branchId } = req.query;
        let teacherId = req.body.teacher_id || req.body.teacherId;

        // If teacherId is not provided, try to find it from the logged-in user
        if (!teacherId && req.user.role === 'TEACHER') {
            const teacher = await (prisma as any).teacher.findUnique({
                where: { user_id: req.user.id }
            });
            if (teacher) {
                teacherId = teacher.id;
            }
        }

        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID is required and could not be resolved.' });
        }
        
        const note = await BehaviorService.createNote(
            schoolId as string || req.user.school_id,
            branchId as string,
            teacherId,
            req.body
        );
        res.status(201).json(note);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteBehaviorNote = async (req: Request, res: Response) => {
    try {
        await BehaviorService.deleteNote(req.params.id);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
