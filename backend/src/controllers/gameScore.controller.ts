import { Request, Response } from 'express';
import { GameScoreService } from '../services/gameScore.service';

export const submitScore = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId || (req as any).user?.id;
        const { game_id, game_name, score, metadata } = req.body;
        // Trust the authenticated tenant, never a client-supplied school id.
        const schoolId = (req as any).user?.school_id || (req as any).school_id;

        const result = await GameScoreService.submitScore({
            game_id,
            game_name,
            player_id: userId,
            score,
            school_id: schoolId,
            metadata,
        });
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error submitting game score:', error);
        res.status(500).json({ error: 'Failed to submit score', details: error.message });
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const gameId = String(req.params.gameId);
        const schoolId: string | undefined = (req as any).user?.school_id || (req.query.schoolId as string | undefined);
        const limit = parseInt(req.query.limit as string) || 20;

        const scores = await GameScoreService.getLeaderboard(gameId, schoolId, limit);
        res.json(scores);
    } catch (error: any) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

export const getMyScores = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const gameId = req.query.gameId as string | undefined;

        const scores = await GameScoreService.getMyScores(userId, gameId);
        res.json(scores);
    } catch (error: any) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
};
