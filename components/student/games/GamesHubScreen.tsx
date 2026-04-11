
import React, { useState, useMemo, useEffect } from 'react';
import { PlayIcon, Gamepad2 as GameControllerIcon, TrophyIcon, BriefcaseIcon, ChevronRightIcon, Search as SearchIcon, Sword, Mic2, Sparkles as SparklesIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { EducationalGame } from '../../../data/gamesData';
import { Student, AIGame } from '../../../types';
import { api } from '../../../lib/api';

interface GamesHubScreenProps {
    navigateTo: (view: string, title?: string, props?: any) => void;
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
                                        else if (game.gameName === 'Virtual Science Lab') navigateTo('virtualScienceLab', 'Science Lab');
                                        else if (game.gameName === 'Debate Dash') navigateTo('debateDash', 'Debate Dash');
                                        else if (game.gameName === 'Geometry Jeopardy') navigateTo('geometryJeopardy', 'Geometry Jeopardy');
                                        else if (game.gameName === 'Literary Analysis Shark Tank') navigateTo('sharkTank', 'Literary Shark Tank');
                                        else if (game.gameName === 'Virtual Lab Simulation') navigateTo('physicsLab', 'Physics Lab');
                                        else if (game.gameName === 'Stock Market Game') navigateTo('stockMarket', 'Stock Market Simulator');
                                        else if (game.gameName === 'Vocabulary Pictionary') navigateTo('vocabularyPictionary', 'Vocabulary Pictionary');
                                        else if (game.gameName === 'Simple Machine Scavenger Hunt') navigateTo('simpleMachineHunt', 'Scavenger Hunt');
                                        else if (game.gameName === 'Historical Hot Seat') navigateTo('historicalHotSeat', 'Historical Hot Seat');
                                        else if (game.gameName === 'Vocabulary Ninja') navigateTo('vocabularyNinja', 'Vocabulary Ninja');
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

const LeaderboardSection: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetching a specific game for now, can be 'global' once backend is updated
                const data = await api.getLeaderboard('global'); 
                setLeaderboard(data.slice(0, 5)); // Top 5
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return null;
    if (leaderboard.length === 0) return null;

    return (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <TrophyIcon className="w-6 h-6 text-yellow-500" />
                Live Leaderboard
            </h3>
            <div className="space-y-3">
                {leaderboard.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100">
                        <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                i === 1 ? 'bg-slate-200 text-slate-700' :
                                i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                                {i + 1}
                            </span>
                            <div>
                                <p className="font-bold text-gray-800 leading-none">{entry.player?.full_name || 'Anonymous'}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{entry.game_name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-orange-600 leading-none">{entry.score}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Points</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* FeaturedGameCard Component */
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

const GamesHubScreen: React.FC<GamesHubScreenProps> = ({ navigateTo, student }) => {
    const [dbGames, setDbGames] = useState<EducationalGame[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGames = async () => {
            try {
                setLoading(true);
                const data = await api.getGames();
                // Map DB games to UI interface
                const mappedGames: EducationalGame[] = data.map((g: any) => ({
                    id: g.id,
                    gameName: g.title,
                    subject: g.game_type,
                    level: g.config?.level || 'Junior Secondary (12-14 years)',
                    mode: g.config?.mode || 'Both',
                    howToPlay: g.config?.howToPlay || g.description,
                    learningGoal: g.description,
                    topic: g.config?.topic || g.game_type
                }));
                setDbGames(mappedGames);
            } catch (err) {
                console.error('Error fetching games:', err);
                toast.error('Failed to load games catalog');
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, []);

    const studentLevel = getStudentLevel(student?.grade || 1);

    const gamesByLevel = useMemo(() => {
        return dbGames.reduce((acc, game) => {
            (acc[game.level] = acc[game.level] || []).push(game);
            return acc;
        }, {} as Record<string, EducationalGame[]>);
    }, [dbGames]);

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
            title: 'Vocabulary Ninja',
            description: 'Slice through the words!',
            icon: <Sword className="w-7 h-7 text-white" />,
            bgColor: 'bg-pink-600 bg-gradient-to-br from-pink-600 to-rose-700',
            action: () => navigateTo('vocabularyNinja', 'Vocabulary Ninja')
        },
        {
            title: 'Hot Seat',
            description: 'Historical figure roleplay.',
            icon: <Mic2 className="w-7 h-7 text-white" />,
            bgColor: 'bg-amber-500 bg-gradient-to-br from-amber-500 to-orange-600',
            action: () => navigateTo('historicalHotSeat', 'Historical Hot Seat')
        },
        {
            title: 'Science Lab',
            description: 'Virtual experiments.',
            icon: <div className="text-2xl font-bold text-white">🧪</div>,
            bgColor: 'bg-teal-500 bg-gradient-to-br from-teal-500 to-green-600',
            action: () => navigateTo('physicsLab', 'Physics Lab')
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
        { title: "History Quest", description: "Time travel adventure", category: "History", color: "amber" },
        { title: "Eco Warrior", description: "Save the environment!", category: "Ethics", color: "green" }
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

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-8 space-y-4">
                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                <p className="text-orange-600 font-bold animate-pulse">Loading Games Catalog...</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pb-20 bg-gray-50">
            <div className="p-4 space-y-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="relative overflow-hidden bg-indigo-600 rounded-3xl p-8 text-white shadow-2xl">
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black tracking-tight">Game Center</h1>
                        <p className="text-indigo-100 mt-2 text-lg font-medium opacity-90">Ready for a learning adventure, {student?.name}?</p>
                    </div>
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl"></div>
                </div>

                {/* Featured Horizontal Scroll */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <SparklesIcon className="w-6 h-6 text-yellow-500" />
                            Featured Games
                        </h2>
                    </div>
                    <div className="flex space-x-4 overflow-x-auto pb-6 px-2 scrollbar-hide snap-x">
                        {featuredGames.map((game, i) => (
                            <div key={i} className="snap-center">
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

                {/* Leaderboard and Categories Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Categories */}
                        <div className="flex space-x-2 overflow-x-auto py-2 scrollbar-hide no-scrollbar">
                            {categoryTabs.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
                                        activeCategory === cat 
                                        ? 'bg-indigo-600 text-white shadow-indigo-200' 
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Your Level Section */}
                        {studentLevel && gamesByLevel[studentLevel] && activeCategory === "All" && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-black text-gray-900 px-2 flex items-center gap-2">
                                    <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                                    Just for Your Level
                                </h2>
                                <LevelAccordion 
                                    level={studentLevel} 
                                    games={gamesByLevel[studentLevel]} 
                                    defaultOpen={true}
                                    navigateTo={navigateTo}
                                    student={student}
                                />
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <LeaderboardSection />
                    </div>
                </div>

                {/* All Levels Selection */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900 px-2">Browse All Levels</h2>
                    <div className="space-y-4">
                        {levels.filter(l => l !== studentLevel || activeCategory !== "All").map(level => (
                            <LevelAccordion 
                                key={level} 
                                level={level} 
                                games={gamesByLevel[level] || []}
                                navigateTo={navigateTo}
                                student={student}
                            />
                        ))}
                    </div>
                </div>

                {/* Coming Soon */}
                <div className="bg-gray-100 rounded-3xl p-8 border-2 border-dashed border-gray-300 transition-all hover:border-indigo-300">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-black text-gray-800">Mystery Games?</h3>
                            <p className="text-gray-500 font-medium mt-1">Our AI is designing something special just for you!</p>
                        </div>
                        <div className="flex -space-x-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-2xl animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}>
                                    {['🎁', '🎲', '🧩'][i-1]}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamesHubScreen;