import React, { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { GameControllerIcon, ChevronRightIcon, PlayIcon, SearchIcon, BriefcaseIcon } from '../../../constants';
import { educationalGamesData, EducationalGame } from '../../../data/gamesData';
import { mockStudents, mockCustomAIGames } from '../../../data';
import { Student, AIGame } from '../../../types';


// Mock imports removed or kept if needed for other things


const getStudentLevel = (grade: number): EducationalGame['level'] | null => {
    if (grade >= 1 && grade <= 3) return 'Lower Primary (6-8 years)';
    if (grade >= 4 && grade <= 6) return 'Upper Primary (9-11 years)';
    if (grade >= 7 && grade <= 9) return 'Junior Secondary (12-14 years)';
    if (grade >= 10 && grade <= 12) return 'Senior Secondary (15-18 years)';
    return null;
};

const GameCard: React.FC<{ game: EducationalGame | (AIGame & { mode: 'Online' }); onClick?: () => void }> = ({ game, onClick }) => {
    const modeStyle = {
        Online: 'bg-green-100 text-green-800',
        Offline: 'bg-orange-100 text-orange-800',
        Both: 'bg-sky-100 text-sky-800'
    };

    const Wrapper = onClick ? 'button' : 'div';

    return (
        <Wrapper
            onClick={onClick}
            className={`w-full text-left bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-orange-300' : ''}`}
        >
            <h4 className="font-bold text-orange-800">{game.gameName}</h4>
            <p className="text-xs font-semibold text-gray-500 mt-1">{game.subject}</p>
            <p className="text-sm text-gray-700 mt-2"><strong>How to Play:</strong> {'howToPlay' in game ? game.howToPlay : `A quiz about ${game.topic}.`}</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Learning Goal:</strong> {'learningGoal' in game ? game.learningGoal : `Test your knowledge on ${game.topic}.`}</p>
            <div className="mt-3 flex justify-between items-center">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${modeStyle[game.mode]}`}>{game.mode} Activity</span>
                {onClick && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-white bg-green-500 rounded-full flex items-center space-x-1">
                        <PlayIcon className="w-3 h-3" />
                        <span>Play</span>
                    </div>
                )}
            </div>
        </Wrapper>
    );
};

const LevelAccordion: React.FC<{ level: string; games: EducationalGame[]; defaultOpen?: boolean; navigateTo: (view: string, title: string, props?: any) => void; }> = ({ level, games, defaultOpen = false, navigateTo }) => {
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
                    {games.map((game, index) => {
                        const isPlayable = game.gameName === 'Math Sprint';
                        return (
                            <GameCard
                                key={index}
                                game={game}
                                onClick={isPlayable ? () => navigateTo('mathSprintLobby', 'Math Sprint', {}) : undefined}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const FeaturedGameCard: React.FC<{ title: string; description: string; icon: React.ReactNode; bgColor: string; onClick: () => void; }> = ({ title, description, icon, bgColor, onClick }) => (
    <div className={`flex-shrink-0 w-64 h-48 ${bgColor} rounded-2xl p-4 flex flex-col justify-between text-white shadow-lg`}>
        <div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">{icon}</div>
            <h3 className="font-bold text-xl">{title}</h3>
            <p className="text-sm opacity-90 mt-1">{description}</p>
        </div>
        <button onClick={onClick} className="self-start bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-white/40 transition-colors">
            Play Now
        </button>
    </div>
);


interface GamesHubScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    student: Student;
}

const GamesHubScreen: React.FC<GamesHubScreenProps> = ({ navigateTo, student }) => {
    const studentLevel = getStudentLevel(student?.grade || 1);


    const customGamesForLevel = useMemo(() => {
        return mockCustomAIGames.filter(game => game.level === studentLevel && game.status === 'Published');
    }, [studentLevel]);

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

    const featuredGames = [
        {
            title: 'Math Sprint',
            description: 'Test your calculation speed!',
            icon: <div className="text-2xl font-bold text-white">123</div>,
            bgColor: 'bg-sky-500 bg-gradient-to-br from-sky-500 to-blue-600',
            action: () => navigateTo('mathSprintLobby', 'Math Sprint', {})
        },
        {
            title: 'GeoGuesser',
            description: 'Guess locations around the world.',
            icon: <SearchIcon className="w-7 h-7 text-white" />,
            bgColor: 'bg-green-500 bg-gradient-to-br from-green-500 to-teal-600',
            action: () => toast('GeoGuesser is coming soon!', { icon: '🌍' })
        },
        {
            title: 'Code Challenge',
            description: 'Learn logic with fun code blocks.',
            icon: <BriefcaseIcon className="w-7 h-7 text-white" />,
            bgColor: 'bg-purple-500 bg-gradient-to-br from-purple-500 to-indigo-600',
            action: () => toast('Code Challenge is coming soon!', { icon: '💻' })
        },
    ];

    return (
        <div className="p-4 space-y-5 bg-gray-50 h-full overflow-y-auto">
            <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-200">
                <GameControllerIcon className="h-10 w-10 mx-auto text-orange-400 mb-2" />
                <h3 className="font-bold text-lg text-orange-800">Games Hub</h3>
                <p className="text-sm text-orange-700">Learn and have fun with these educational games!</p>
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Featured Games</h3>
                <div className="flex space-x-4 overflow-x-auto pb-4 -mb-4">
                    {featuredGames.map(game => (
                        <FeaturedGameCard
                            key={game.title}
                            title={game.title}
                            description={game.description}
                            icon={game.icon}
                            bgColor={game.bgColor}
                            onClick={game.action}
                        />
                    ))}
                </div>
            </div>

            {customGamesForLevel.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Teacher-Created Games</h3>
                    <div className="space-y-3">
                        {customGamesForLevel.map(game => (
                            <GameCard
                                key={game.id}
                                game={{ ...game, mode: 'Online' }}
                                onClick={() => navigateTo('gamePlayer', game.gameName, { game, mode: 'play' })}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 px-1">Game Library</h3>
                <div className="space-y-3">
                    {levels.map((level) => (
                        gamesByLevel[level] && (
                            <LevelAccordion
                                key={level}
                                level={level}
                                games={gamesByLevel[level]}
                                defaultOpen={level === studentLevel}
                                navigateTo={navigateTo}
                            />
                        )
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GamesHubScreen;