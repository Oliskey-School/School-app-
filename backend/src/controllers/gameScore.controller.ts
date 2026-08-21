import { Request, Response } from 'express';
import { GameScoreService } from '../services/gameScore.service';
import { getEffectiveBranchId } from '../utils/branchScope';

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
            branch_id: getEffectiveBranchId((req as any).user) || null,
            metadata,
        });
        res.status(201).json(result);
    } catch (error: any) {
        // A rejected score is a client error (400), not a server failure.
        if (error?.status === 400) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error submitting game score:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const gameId = String(req.params.gameId);
        // Never trust a client-supplied schoolId — always scope to the authenticated tenant.
        const schoolId: string | undefined = (req as any).user?.school_id;
        const limit = parseInt(req.query.limit as string) || 20;

        const branchId = getEffectiveBranchId((req as any).user);
        const scores = await GameScoreService.getLeaderboard(gameId, schoolId, limit, branchId);
        res.json(scores);
    } catch (error: any) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

export const getMyScores = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId || (req as any).user?.id;
        const gameId = req.query.gameId as string | undefined;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const scores = await GameScoreService.getMyScores(userId, gameId);
        res.json(scores);
    } catch (error: any) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
};
