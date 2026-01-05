import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentPoints, PointTransaction, StudentBadge, BadgeFull } from '../../types-additional';
import { Student } from '../../types';
import { toast } from 'react-hot-toast';
import { TrophyIcon, SparklesIcon, FireIcon } from '../../constants';

interface RewardsSystemProps {
    student: Student;
}

const RewardsSystem: React.FC<RewardsSystemProps> = ({ student }) => {
    const [points, setPoints] = useState<StudentPoints | null>(null);
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
    const [badges, setBadges] = useState<StudentBadge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRewardsData();
    }, [student.id]);

    const fetchRewardsData = async () => {
        try {
            // Fetch points
            const { data: pointsData } = await supabase
                .from('student_points')
                .select('*')
                .eq('student_id', student.id)
                .single();

            if (pointsData) {
                setPoints(pointsData);
            } else {
                // Initialize points if don't exist
                const { data: newPoints } = await supabase
                    .from('student_points')
                    .insert({ student_id: student.id, points: 0, level: 1 })
                    .select()
                    .single();
                setPoints(newPoints);
            }

            // Fetch recent transactions
            const { data: transData } = await supabase
                .from('point_transactions')
                .select('*, awarded_by_user:users!awarded_by(name)')
                .eq('student_id', student.id)
                .order('created_at', { ascending: false })
                .limit(10);

            setTransactions(transData || []);

            // Fetch earned badges
            const { data: badgesData } = await supabase
                .from('student_badges')
                .select('*, badge:badges(*)')
                .eq('student_id', student.id);

            setBadges(badgesData || []);

        } catch (error) {
            console.error('Error fetching rewards:', error);
            toast.error('Failed to load rewards data');
        } finally {
            setLoading(false);
        }
    };

    const getLevel = (pts: number) => {
        if (pts >= 1000) return 5;
        if (pts >= 500) return 4;
        if (pts >= 250) return 3;
        if (pts >= 100) return 2;
        return 1;
    };

    const getNextLevelPoints = (currentPoints: number) => {
        const levels = [0, 100, 250, 500, 1000];
        const currentLevel = getLevel(currentPoints);
        return levels[currentLevel] || 1000;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;
    }

    const currentLevel = points ? getLevel(points.points) : 1;
    const nextLevelPoints = getNextLevelPoints(points?.points || 0);
    const progress = points ? ((points.points % nextLevelPoints) / nextLevelPoints) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Points Overview */}
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm opacity-90">Your Points</p>
                        <p className="text-5xl font-bold">{points?.points || 0}</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full">
                        <TrophyIcon className="h-6 w-6" />
                        <span className="font-bold">Level {currentLevel}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between text-xs mb-1 opacity-90">
                        <span>Level {currentLevel}</span>
                        <span>Level {currentLevel + 1}</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-3">
                        <div
                            className="bg-white h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs mt-1 opacity-75">
                        {nextLevelPoints - (points?.points || 0)} points to next level
                    </p>
                </div>
            </div>

            {/* Earned Badges */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <SparklesIcon className="h-6 w-6 text-yellow-500" />
                    <h3 className="text-lg font-bold text-gray-800">Earned Badges</h3>
                </div>

                {badges.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {badges.map((studentBadge) => (
                            <div key={studentBadge.id} className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
                                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-3xl">
                                    🏆
                                </div>
                                <p className="text-sm font-semibold text-gray-800 text-center">{studentBadge.badge?.name}</p>
                                <p className="text-xs text-gray-500 text-center">{new Date(studentBadge.earned_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No badges earned yet. Keep working hard!</p>
                )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <FireIcon className="h-6 w-6 text-orange-500" />
                    <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
                </div>

                <div className="space-y-3">
                    {transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{transaction.reason}</p>
                                <p className="text-xs text-gray-500">
                                    {new Date(transaction.created_at).toLocaleString()}
                                    {transaction.awarded_by_user && ` • by ${transaction.awarded_by_user.name}`}
                                </p>
                            </div>
                            <div className={`font-bold text-lg ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.points > 0 ? '+' : ''}{transaction.points}
                            </div>
                        </div>
                    ))}

                    {transactions.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No activity yet</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RewardsSystem;
