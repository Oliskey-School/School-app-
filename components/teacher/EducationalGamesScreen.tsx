import React, { useState, useMemo } from 'react';
import { educationalGamesData, EducationalGame } from '../../data/gamesData';
import { ChevronRightIcon, GameControllerIcon, PlusIcon } from '../../constants';

const GameCard: React.FC<{ game: EducationalGame }> = ({ game }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h4 className="font-bold text-purple-800">{game.gameName}</h4>
        <p className="text-xs font-semibold text-gray-500 mt-1">{game.subject}</p>
        <p className="text-sm text-gray-700 mt-2"><strong>How to Play:</strong> {game.howToPlay}</p>
        <p className="text-sm text-gray-700 mt-2"><strong>Learning Goal:</strong> {game.learningGoal}</p>
        <div className="mt-3 text-right">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">{game.mode}</span>
        </div>
    </div>
);

const LevelAccordion: React.FC<{ level: string; games: EducationalGame[]; defaultOpen?: boolean }> = ({ level, games, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isOpen}
            >
                <h3 className="font-bold text-lg text-gray-800">{level}</h3>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">{games.length} Games</span>
                    <ChevronRightIcon className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </div>
            </button>
            {isOpen && (
                <div className="px-4 pb-4 pt-0 space-y-3 bg-gray-50/50">
                    {games.map((game, index) => (
                        <GameCard key={index} game={game} />
                    ))}
                </div>
            )}
        </div>
    );
};

interface EducationalGamesScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const EducationalGamesScreen: React.FC<EducationalGamesScreenProps> = ({ navigateTo }) => {
    const gamesByLevel = useMemo(() => {
        return educationalGamesData.reduce((acc, game) => {
            (acc[game.level] = acc[game.level] || []).push(game);
            return acc;
        }, {} as Record<string, EducationalGame[]>);
    }, []);

    const levels: EducationalGame['level'][] = [
        'Pre-Primary (3-5 years)',
        'Lower Primary (6-8 years)',
        'Upper Primary (9-11 years)',
        'Junior Secondary (12-14 years)',
        'Senior Secondary (15-18 years)'
    ];

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-24">
                <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200">
                    <GameControllerIcon className="h-10 w-10 mx-auto text-purple-400 mb-2" />
                    <h3 className="font-bold text-lg text-purple-800">Educational Games Library</h3>
                    <p className="text-sm text-purple-700">A comprehensive list of games to make learning fun.</p>
                </div>
                {levels.map((level, index) => (
                    gamesByLevel[level] && <LevelAccordion key={level} level={level} games={gamesByLevel[level]} defaultOpen={index === 0} />
                ))}
            </main>
            <div className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 z-40">
                <button
                    onClick={() => navigateTo('aiGameCreator', 'AI Game Creator', {})}
                    className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all hover:scale-110 active:scale-95"
                    aria-label="Create new game with AI"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};

export default EducationalGamesScreen;
