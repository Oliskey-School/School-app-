import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GameScoreService {
    static async submitScore(data: {
        game_id: string;
        game_name: string;
        player_id: string;
        score: number;
        school_id?: string;
        metadata?: any;
    }) {
        return prisma.gameScore.create({
            data: {
                game_id: data.game_id,
                game_name: data.game_name,
                player_id: data.player_id,
                score: data.score,
                school_id: data.school_id || null,
                metadata: data.metadata || null,
            },
        });
    }

    static async getLeaderboard(gameId?: string, schoolId?: string, limit: number = 20) {
        const where: any = {};
        if (gameId && gameId !== 'global') where.game_id = gameId;
        if (schoolId) where.school_id = schoolId;

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
