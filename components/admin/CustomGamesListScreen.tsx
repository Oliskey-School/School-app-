import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { GameControllerIcon, CheckCircleIcon } from '../../constants';
import { AIGame } from '../../types';
import CenteredLoader from '../ui/CenteredLoader';

interface CustomGamesListScreenProps {}

const GameRow: React.FC<{ game: AIGame; creatorName: string; index: number }> = ({ game, creatorName, index }) => {
    const statusStyle = game.status === 'Published'
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-800';

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 15) * 0.03 }} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-gray-800">{game.gameName}</h4>
                    <p className="text-sm text-gray-600">{game.subject} - {game.topic}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle}`}>
                    {game.status}
                </span>
            </div>
            <div className="mt-3 border-t pt-2 text-xs text-gray-500">
                <p><strong>Level:</strong> {game.level}</p>
                <p><strong>Creator:</strong> {creatorName}</p>
                <p><strong>Questions:</strong> {game.questions?.length ?? 0}</p>
            </div>
        </motion.div>
    );
};

const CustomGamesListScreen: React.FC<CustomGamesListScreenProps> = () => {
    const { currentSchool } = useAuth();
    const [games, setGames] = useState<AIGame[]>([]);
    const [creatorMap, setCreatorMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!currentSchool?.id) return;
            setLoading(true);
            setError(null);
            try {
                const [resources, teachers] = await Promise.all([
                    api.getGeneratedResources(currentSchool.id).catch(() => []),
                    api.getTeachers(currentSchool.id).catch(() => [])
                ]);
                if (cancelled) return;

                const map: Record<string, string> = {};
                (teachers || []).forEach((t: any) => {
                    const id = String(t.id ?? t.user_id ?? '');
                    if (id) map[id] = t.full_name || t.name || 'Teacher';
                });
                setCreatorMap(map);

                const customGames: AIGame[] = (resources || [])
                    .filter((r: any) => (r.type || r.resource_type) === 'game' || r.kind === 'AIGame')
                    .map((r: any) => ({
                        id: r.id,
                        gameName: r.title || r.game_name || 'Untitled Game',
                        subject: r.subject || 'General',
                        topic: r.topic || r.description || '',
                        level: r.level || r.grade || 'N/A',
                        creatorId: r.creator_id || r.teacher_id || r.created_by || '',
                        status: r.status === 'Published' || r.is_published ? 'Published' : 'Draft',
                        questions: r.questions || r.payload?.questions || [],
                    } as AIGame));

                setGames(customGames);
            } catch (e: any) {
                if (!cancelled) setError(e.message || 'Failed to load custom games');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [currentSchool?.id]);

    const sortedGames = useMemo(() =>
        [...games].sort((a, b) => (b.status === 'Published' ? 1 : -1) - (a.status === 'Published' ? 1 : -1)),
        [games]
    );

    return (
        <div className="p-4 space-y-4 bg-gray-100">
            <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
                <GameControllerIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2"/>
                <h3 className="font-bold text-lg text-indigo-800">Teacher-Created Games</h3>
                <p className="text-sm text-indigo-700">Review all custom games created by teachers.</p>
            </div>
            <div className="space-y-3">
                {loading ? (
                    <CenteredLoader message="Loading custom games..." className="py-10 bg-white rounded-lg shadow-sm" />
                ) : error ? (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : sortedGames.length > 0 ? (
                    sortedGames.map((game, gi) => (
                        <GameRow
                            key={game.id}
                            game={game}
                            index={gi}
                            creatorName={creatorMap[String(game.creatorId)] || 'Unknown'}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                        <p className="text-gray-500">No custom games have been created yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomGamesListScreen;
