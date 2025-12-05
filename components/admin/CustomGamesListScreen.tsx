import React, { useMemo } from 'react';
import { mockCustomAIGames } from '../../data';
import { mockTeachers } from '../../data';
import { GameControllerIcon, CheckCircleIcon } from '../../constants';
import { AIGame } from '../../types';

interface CustomGamesListScreenProps {}

const GameRow: React.FC<{ game: AIGame }> = ({ game }) => {
    const creator = useMemo(() => mockTeachers.find(t => t.id === game.creatorId), [game.creatorId]);
    const statusStyle = game.status === 'Published' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800';

    return (
        <div className="bg-white rounded-xl shadow-sm p-4">
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
                <p><strong>Creator:</strong> {creator?.name || 'Unknown'}</p>
                <p><strong>Questions:</strong> {game.questions.length}</p>
            </div>
        </div>
    );
};

const CustomGamesListScreen: React.FC<CustomGamesListScreenProps> = () => {
    
    const games = useMemo(() => 
        [...mockCustomAIGames].sort((a, b) => (b.status === 'Published' ? 1 : -1) - (a.status === 'Published' ? 1 : -1))
    , [mockCustomAIGames]);

    return (
        <div className="p-4 space-y-4 bg-gray-100">
            <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
                <GameControllerIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2"/>
                <h3 className="font-bold text-lg text-indigo-800">Teacher-Created Games</h3>
                <p className="text-sm text-indigo-700">Review all custom games created by teachers.</p>
            </div>
            <div className="space-y-3">
                {games.length > 0 ? (
                    games.map(game => <GameRow key={game.id} game={game} />)
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
