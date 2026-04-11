import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';

export const getGames = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const games = await prisma.educationalGame.findMany({
            where: { school_id },
            orderBy: { created_at: 'desc' }
        });
        res.json(games);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createGame = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id, id: teacher_id } = req.user;
        const { title, description, game_type, config, metadata } = req.body;

        const game = await prisma.educationalGame.create({
            data: {
                title,
                description,
                game_type,
                config: config || {},
                metadata: metadata || {},
                teacher_id,
                school_id
            }
        });

        res.status(201).json(game);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteGame = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { school_id } = req.user;

        await prisma.educationalGame.delete({
            where: { id, school_id }
        });

        res.json({ message: 'Game deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
