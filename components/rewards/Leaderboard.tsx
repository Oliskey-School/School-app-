import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentPoints } from '../../types-additional';
import { TrophyIcon, StarIcon, FireIcon } from '../../constants';

interface LeaderboardEntry extends StudentPoints {
    student: {
        id: number;
        name: string;
        avatarUrl?: string;
        grade: number;
        section: string;
    };
}

const Leaderboard: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, [filter]);

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('student_points')
                .select(`
          *,
          student:students(id, name, avatar_url, grade, section)
        `)
                .order('points', { ascending: false })
                .limit(20);

            if (error) throw error;
            setLeaderboard(data || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <TrophyIcon className="h-8 w-8 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-gray-800">Leaderboard</h2>
                </div>

                {/* Filter */}
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'
                            }`}
                    >
                        All Time
                    </button>
                    <button
                        onClick={() => setFilter('month')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${filter === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'
                            }`}
                    >
                        This Month
                    </button>
                    <button
                        onClick={() => setFilter('week')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${filter === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'
                            }`}
                    >
                        This Week
                    </button>
                </div>
            </div>

            {/* Leaderboard */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
            ) : (
                <div className="space-y-3">
                    {leaderboard.map((entry, index) => {
                        const rank = index + 1;
                        const isTopThree = rank <= 3;

                        return (
                            <div
                                key={entry.id}
                                className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${isTopThree ? 'ring-2 ring-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50' : ''
                                    }`}
                            >
                                <div className="flex items-center space-x-4">
                                    {/* Rank */}
                                    <div className={`text-2xl font-bold ${isTopThree ? 'w-12' : 'w-12 text-gray-400'}`}>
                                        {getMedalEmoji(rank)}
                                    </div>

                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        {entry.student.avatarUrl ? (
                                            <img
                                                src={entry.student.avatarUrl}
                                                alt={entry.student.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                {entry.student.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name & Class */}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">{entry.student.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            Grade {entry.student.grade}{entry.student.section}
                                        </p>
                                    </div>

                                    {/* Level Badge */}
                                    <div className="flex items-center space-x-2 bg-purple-100 px-3 py-1 rounded-full">
                                        <StarIcon className="h-4 w-4 text-purple-600" />
                                        <span className="text-sm font-semibold text-purple-700">
                                            Level {entry.level}
                                        </span>
                                    </div>

                                    {/* Points */}
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-indigo-600">
                                            {entry.points.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500">points</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {leaderboard.length === 0 && (
                        <div className="text-center py-16">
                            <TrophyIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No leaderboard data yet</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
