
import React, { useState, useMemo } from 'react';
import { PlayIcon, Gamepad2 as GameControllerIcon, TrophyIcon, BriefcaseIcon, ChevronRightIcon, Search as SearchIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { educationalGamesData, EducationalGame } from '../../../data/gamesData';
import { mockStudents, mockCustomAIGames } from '../../../data';
import { Student, AIGame } from '../../../types';


// Mock imports removed or kept if needed for other things

interface GamesHubScreenProps {
    navigateTo: (view: string, title?: string) => void;
    student: Student;
}


const getStudentLevel = (grade: number): EducationalGame['level'] | null => {
    if (grade < 1) return 'Early Years (1-3 years)';
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

/* LevelAccordion Component Update */
const LevelAccordion: React.FC<{ level: string; games: EducationalGame[]; defaultOpen?: boolean; navigateTo: (view: string, title: string, props?: any) => void; student: Student }> = ({ level, games, defaultOpen = false, navigateTo, student }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOpen ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                        <TrophyIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">{level}</h3>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{games.length} Games</span>
                    <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </div>
            </button>
            {isOpen && (
                <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {games.map((game, index) => {
                            return (
                                <GameCard
                                    key={index}
                                    game={game}
                                    onClick={() => {
                                        if (game.gameName === 'Math Sprint') navigateTo('mathSprintLobby', 'Math Sprint', { student });
                                        else if (game.gameName === 'Peekaboo Letters') navigateTo('peekabooLetters', 'Peekaboo Letters');
                                        else if (game.gameName === 'Math Battle Arena') navigateTo('mathBattleArena', 'Math Battle Arena');
                                        else if (game.gameName === 'CBT Exam Master') navigateTo('cbtExamGame', 'CBT Exam Master');
                                        else if (game.gameName === 'GeoGuesser Team Battle') navigateTo('geoGuesserLobby', 'GeoGuesser', { student });
                                        else if (game.gameName === 'Code Block Challenge') navigateTo('codeChallengeLobby', 'Code Challenge', { student });
                                        else if (game.gameName === 'Counting Shapes Tap') navigateTo('countingShapesTap', 'Counting Shapes Tap');
                                        else if (game.gameName === 'Simon Says Body Parts') navigateTo('simonSays', 'Simon Says Body Parts');
                                        else if (game.gameName === 'Alphabet Fishing') navigateTo('alphabetFishing', 'Alphabet Fishing');
                                        else if (game.gameName === 'Number Bean Bag Toss') navigateTo('beanBagToss', 'Number Bean Bag Toss');
                                        else if (game.gameName === 'Red Light, Green Light Counting') navigateTo('redLightGreenLight', 'Red Light, Green Light');
                                        else if (game.gameName === 'Spelling Sparkle') navigateTo('spellingSparkle', 'Spelling Sparkle');
                                        else if (game.gameName === 'Vocabulary Adventure') navigateTo('vocabularyAdventure', 'Vocabulary Adventure');
                                        else if (game.gameName === 'Virtual Science Lab') navigateTo('physicsLab', 'Physics Lab');
                                        else if (game.gameName === 'Debate Dash') navigateTo('debateDash', 'Debate Dash');
                                        else if (game.gameName === 'Geometry Jeopardy') navigateTo('geometryJeopardy', 'Geometry Jeopardy');
                                        else if (game.gameName === 'Literary Analysis Shark Tank') navigateTo('sharkTank', 'Literary Shark Tank');
                                        else if (game.gameName === 'Virtual Science Lab') navigateTo('physicsLab', 'Physics Lab');
                                        else if (game.gameName === 'Stock Market Game') navigateTo('stockMarket', 'Stock Market Simulator');
                                        else toast('Game coming soon!', { icon: '🚧' });
                                    }}
                                />
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ... FeaturedGameCard ... */
const FeaturedGameCard: React.FC<{ title: string; description: string; icon: React.ReactNode; bgColor: string; onClick: () => void; }> = ({ title, description, icon, bgColor, onClick }) => (
    <div className={`flex-shrink-0 w-72 md:w-80 h-48 ${bgColor} rounded-2xl p-5 flex flex-col justify-between text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer`}>
        <div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm">{icon}</div>
            <h3 className="font-bold text-xl tracking-tight">{title}</h3>
            <p className="text-sm opacity-90 mt-1 font-medium text-blue-50/90">{description}</p>
        </div>
        <button onClick={onClick} className="self-start bg-white text-gray-900 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm">
            Play Now
        </button>
    </div>
);

/* ... Main Component ... */
const GamesHubScreen: React.FC<GamesHubScreenProps> = ({ navigateTo, student }) => {
    /* ... Logic ... */
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
        'Early Years (1-3 years)',
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
            action: () => navigateTo('mathSprintLobby', 'Math Sprint')
        },
        {
            title: 'GeoGuesser',
            description: 'Guess locations around the world.',
            icon: <SearchIcon className="w-7 h-7 text-white" />,
            bgColor: 'bg-green-500 bg-gradient-to-br from-green-500 to-teal-600',
            action: () => navigateTo('geoGuesserLobby', 'GeoGuesser')
        },
        {
            title: 'Code Challenge',
            description: 'Learn logic with fun code blocks.',
            icon: <BriefcaseIcon className="w-7 h-7 text-white" />,
            bgColor: 'bg-purple-500 bg-gradient-to-br from-purple-500 to-indigo-600',
            action: () => navigateTo('codeChallengeLobby', 'Code Challenge')
        },
        {
            title: 'CBT Simulator',
            description: 'Ace your JAMB exams.',
            icon: <TrophyIcon className="w-7 h-7 text-white" />,
            bgColor: 'bg-orange-500 bg-gradient-to-br from-orange-500 to-red-600',
            action: () => navigateTo('cbtExamGame', 'CBT Exam Master')
        },
        {
            title: 'Math Battle',
            description: 'PvP Arithmetic Duels.',
            icon: <div className="text-2xl font-bold text-white">÷</div>,
            bgColor: 'bg-pink-500 bg-gradient-to-br from-pink-500 to-rose-600',
            action: () => navigateTo('mathBattleArena', 'Math Battle Arena')
        },
        {
            title: 'Peekaboo Letters',
            description: 'Fun alphabet learning.',
            icon: <div className="text-2xl font-bold text-white">Abc</div>,
            bgColor: 'bg-yellow-400 bg-gradient-to-br from-yellow-400 to-orange-400',
            action: () => navigateTo('peekabooLetters', 'Peekaboo Letters')
        },
    ];

    const comingSoonGames = [
        { title: "Vocabulary Ninja", description: "Slice through words!", category: "Language", color: "pink" },
        { title: "History Quest", description: "Time travel adventure", category: "History", color: "amber" },
        { title: "Science Lab", description: "Virtual experiments", category: "Science", color: "teal" }
    ];

    const categoryTabs = ["All", "Math", "Geography", "Coding", "Logic"];
    const [activeCategory, setActiveCategory] = useState("All");

    const filteredGames = useMemo(() => {
        let allGames: EducationalGame[] = [];
        Object.values(gamesByLevel).forEach(levelGames => {
            allGames = [...allGames, ...levelGames];
        });

        if (activeCategory === "All") return allGames;
        return allGames.filter(g => g.subject.includes(activeCategory) || (activeCategory === "Logic" && g.gameName.includes("Code")));
    }, [activeCategory, gamesByLevel]);

    return (
        <div className="h-full overflow-y-auto pb-20 bg-gray-50">
            <div className="p-4 space-y-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 md:p-10 text-white text-center shadow-lg relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <GameControllerIcon className="h-12 w-12 md:h-16 md:w-16 mx-auto text-white mb-4 opacity-90" />
                        <h3 className="font-extrabold text-3xl md:text-4xl mb-3 tracking-tight">Games Arcade</h3>
                        <p className="text-orange-50 text-base md:text-lg font-medium opacity-90 max-w-md mx-auto">
                            Play educational games, earn badges, and climb the leaderboard!
                        </p>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute top-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-white opacity-10 rounded-full -translate-x-10 -translate-y-10 blur-xl"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 md:w-40 md:h-40 bg-white opacity-10 rounded-full translate-x-5 translate-y-5 blur-xl"></div>
                </div>

                {/* Featured Section */}
                <div>
                    <div className="flex items-center justify-between px-1 mb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <PlayIcon className="w-6 h-6 text-orange-600" />
                            Featured Games
                        </h3>
                    </div>
                    <div className="flex overflow-x-auto pb-6 gap-6 snap-x snap-mandatory no-scrollbar px-1 -mx-1 py-1">
                        {featuredGames.map(game => (
                            <div key={game.title} className="snap-start">
                                <FeaturedGameCard
                                    title={game.title}
                                    description={game.description}
                                    icon={game.icon}
                                    bgColor={game.bgColor}
                                    onClick={game.action}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Categories & Library */}
                <div>
                    <div className="flex items-center justify-between px-1 mb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <BriefcaseIcon className="w-6 h-6 text-blue-600" />
                            Browse Library
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {levels.map((level) => (
                            gamesByLevel[level] && gamesByLevel[level].length > 0 && (
                                <LevelAccordion
                                    key={level}
                                    level={level}
                                    games={gamesByLevel[level]}
                                    defaultOpen={true}
                                    navigateTo={navigateTo}
                                    student={student}
                                />
                            )
                        ))}
                    </div>
                </div>

                {/* Coming Soon Section */}
                <div>
                    <div className="flex items-center gap-2 px-1 mb-4">
                        <h3 className="text-lg md:text-xl font-bold text-gray-500 uppercase tracking-widest text-sm">Coming Soon</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {comingSoonGames.map((game, i) => (
                            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 border-dashed relative overflow-hidden flex flex-col items-center text-center opacity-80 hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-2xl">
                                    {game.category === 'Language' ? '📚' : game.category === 'History' ? '🏛️' : '🔬'}
                                </div>
                                <h4 className="font-bold text-gray-900 mb-1">{game.title}</h4>
                                <p className="text-sm text-gray-500 mb-3">{game.description}</p>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-gray-200 px-2 py-1 rounded inline-block">
                                    In Development
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamesHubScreen;