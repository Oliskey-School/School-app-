import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { seedClassBattleGames, getClassmates, getBattleSetup } from '../services/classBattle.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { generateAIQuestions } from '../services/gameQuestion.service';
import { buildRounds } from '../services/gameContent.service';

export const getGames = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const { class_id, subject } = req.query as { class_id?: string; subject?: string };
        // branch_id is nullable on this model: null means shared school-wide
        // content, so a branch-locked admin must see their own branch's games
        // PLUS shared ones — never another branch's private games.
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string, req.headers['x-branch-id'] as string);
        const games = await prisma.educationalGame.findMany({
            where: {
                school_id,
                ...(branchId ? { OR: [{ branch_id: branchId }, { branch_id: null }] } : {}),
                ...(class_id ? { class_id } : {}),
                ...(subject ? { subject } : {}),
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(games);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/** Create/refresh the per-class "Class Battle" games for the caller's school. */
export const seedClassBattles = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string, req.headers['x-branch-id'] as string) || null;
        const result = await seedClassBattleGames(school_id, branchId);
        res.json({ message: 'Class Battle games ready', ...result });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/** The classmates a student can invite to a battle. */
export const listClassmates = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id, id } = req.user;
        const mates = await getClassmates(id, school_id);
        res.json(mates);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/** Lobby setup (subjects + grade) for a stored Class Battle game. */
export const battleSetup = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const setup = await getBattleSetup(String(req.params.id), school_id);
        if (!setup) return res.status(404).json({ message: 'Game not found' });
        res.json(setup);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Fresh AI-generated multiple-choice questions for a solo quiz-style game
 * (Geometry Jeopardy, Vocabulary Adventure, Spelling Sparkle, Vocabulary
 * Ninja, Historical Hot Seat), tailored to the caller's own class/subject/age
 * and never repeating a question they've already been asked in this game.
 * Falls back to the offline procedural/curated bank if the AI call fails.
 */
export const getAIQuestions = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id, id } = req.user;
        const branchId = getEffectiveBranchId(req.user);
        const { gameType, subject, count } = req.query as { gameType?: string; subject?: string; count?: string };
        if (!gameType || !subject) {
            return res.status(400).json({ message: 'gameType and subject are required' });
        }

        const student = await prisma.student.findUnique({
            where: { user_id: id },
            select: { id: true, grade: true, branch_id: true },
        });
        if (!student) return res.status(403).json({ message: 'No student profile found for this account' });

        const requestedCount = Math.min(Math.max(parseInt(count || '10', 10) || 10, 1), 25);

        try {
            const questions = await generateAIQuestions({
                schoolId: school_id,
                branchId: branchId || student.branch_id,
                studentId: student.id,
                gameType,
                subject,
                grade: student.grade,
                count: requestedCount,
                historyScope: 'student',
            });
            res.json({ questions, source: 'ai' });
        } catch (aiErr: any) {
            console.warn(`[Games] AI question generation failed for ${gameType}, using offline bank:`, aiErr?.message);
            const questions = buildRounds(subject, student.grade, requestedCount);
            res.json({ questions, source: 'offline' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createGame = async (req: AuthRequest, res: Response) => {
    try {
        const { school_id } = req.user;
        const { title, description, game_type, config, metadata, class_id, subject, grade } = req.body;

        // teacher_id is a FK to Teacher.id — NOT the user id. Resolve the caller's
        // teacher record (teachers create games); for an admin/non-teacher caller,
        // fall back to any teacher in the school so the required FK is satisfied.
        const teacher = await prisma.teacher.findFirst({ where: { user_id: req.user.id }, select: { id: true } })
            || await prisma.teacher.findFirst({ where: { school_id }, select: { id: true } });
        if (!teacher) {
            return res.status(400).json({ message: 'No teacher available to own this game. Add a teacher first.' });
        }

        const game = await prisma.educationalGame.create({
            data: {
                title,
                description,
                game_type,
                config: config || {},
                metadata: metadata || {},
                teacher_id: teacher.id,
                school_id,
                ...(class_id ? { class_id } : {}),
                ...(subject ? { subject } : {}),
                ...(grade != null ? { grade: Number(grade) } : {}),
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
            where: { id: String(id), school_id }
        });

        res.json({ message: 'Game deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
