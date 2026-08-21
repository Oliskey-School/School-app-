import prisma from '../config/database';

export class GameScoreService {
    // A leaderboard score is client-reported by nature, but it should at least be
    // a sane number: any value was previously accepted, so a forged
    // {"score": 123456} for a non-existent game id was stored and topped the board.
    static readonly MAX_SCORE = 1_000_000;

    static async submitScore(data: {
        game_id: string;
        game_name: string;
        player_id: string;
        score: number;
        school_id?: string;
        branch_id?: string | null;
        metadata?: any;
    }) {
        const score = Number(data.score);
        if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > GameScoreService.MAX_SCORE) {
            throw Object.assign(
                new Error(`score must be a whole number between 0 and ${GameScoreService.MAX_SCORE}`),
                { status: 400 }
            );
        }

        return prisma.gameScore.create({
            data: {
                game_id: data.game_id,
                game_name: data.game_name,
                player_id: data.player_id,
                score,
                school_id: data.school_id || null,
                // branch_id exists on the model but was never written, so every row
                // had null and getLeaderboard could only filter by school — pooling
                // every branch (and every demo sandbox) into one board.
                branch_id: data.branch_id || null,
                metadata: data.metadata || null,
            },
        });
    }

    static async getLeaderboard(gameId?: string, schoolId?: string, limit: number = 20, branchId?: string) {
        const where: any = { deleted_at: null };
        if (gameId && gameId !== 'global') where.game_id = gameId;
        if (schoolId) where.school_id = schoolId;
        // Scope to the caller's branch when one is active. Rows written before
        // branch_id was populated have null, so they are included alongside the
        // active branch rather than vanishing from the board.
        if (branchId && branchId !== 'all') {
            where.OR = [{ branch_id: branchId }, { branch_id: null }];
        }

        return prisma.gameScore.findMany({
            where,
            orderBy: { score: 'desc' },
            take: limit,
            include: {
                player: {
                    select: { id: true, full_name: true, avatar_url: true },
                },
            },
        });
    }

    static async getMyScores(playerId: string, gameId?: string) {
        const where: any = { player_id: playerId };
        if (gameId) where.game_id = gameId;

        return prisma.gameScore.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 50,
        });
    }
}
