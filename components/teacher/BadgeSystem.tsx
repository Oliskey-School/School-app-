import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import {
    StarIcon,
    CheckCircleIcon,
    TrophyIcon
} from '../../constants';

interface Badge {
    id: number;
    name: string;
    description: string;
    icon_url: string;
    criteria: string;
    points: number;
    is_earned: boolean;
    earned_at?: string;
}

const BadgeSystem: React.FC = () => {
    const { profile } = useProfile();
    const [badges, setBadges] = useState<Badge[]>([]);
    const [totalPoints, setTotalPoints] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBadges();
    }, []);

    const fetchBadges = async () => {
        try {
            setLoading(true);

            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) {
                setLoading(false);
                return;
            }

            // Get all badges
            const { data: allBadges } = await supabase
                .from('pd_badges')
                .select('*');

            // Get earned badges
            const { data: earnedBadges } = await supabase
                .from('teacher_badges')
                .select('badge_id, earned_at')
                .eq('teacher_id', teacherData.id);

            const earnedMap = new Map(earnedBadges?.map(b => [b.badge_id, b.earned_at]) || []);

            const formatted: Badge[] = (allBadges || []).map((b: any) => ({
                id: b.id,
                name: b.name,
                description: b.description,
                icon_url: b.icon_url,
                criteria: b.criteria,
                points: b.points,
                is_earned: earnedMap.has(b.id),
                earned_at: earnedMap.get(b.id)
            }));

            setBadges(formatted);
            setTotalPoints(formatted.filter(b => b.is_earned).reduce((sum, b) => sum + b.points, 0));
        } catch (error: any) {
            console.error('Error fetching badges:', error);
        } finally {
            setLoading(false);
        }
    };

    const earnedBadges = badges.filter(b => b.is_earned);
    const availableBadges = badges.filter(b => !b.is_earned);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Achievement Badges</h2>
                <p className="text-sm text-gray-600 mt-1">Track your professional development achievements</p>
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-purple-100 text-sm">Total Points Earned</p>
                        <h3 className="text-4xl font-bold mt-2">{totalPoints}</h3>
                        <p className="text-purple-100 text-sm mt-2">
                            {earnedBadges.length} badges earned • {availableBadges.length} available
                        </p>
                    </div>
                    <TrophyIcon className="w-12 h-12 text-purple-200" />
                </div>
            </div>

            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Earned Badges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {earnedBadges.map((badge) => (
                            <div key={badge.id} className="bg-white rounded-xl shadow-sm border-2 border-green-500 p-6">
                                <div className="text-center">
                                    <div className="text-4xl mb-2">{badge.icon_url}</div>
                                    <h4 className="font-bold text-gray-900">{badge.name}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
                                    <div className="flex items-center justify-center space-x-2 mt-3">
                                        <StarIcon className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm font-medium text-gray-700">{badge.points} points</span>
                                    </div>
                                    <p className="text-xs text-green-600 mt-2">
                                        ✓ Earned {new Date(badge.earned_at!).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Badges */}
            {availableBadges.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Available Badges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {availableBadges.map((badge) => (
                            <div key={badge.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="text-center">
                                    <div className="text-4xl mb-2 grayscale">{badge.icon_url}</div>
                                    <h4 className="font-bold text-gray-900">{badge.name}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
                                        <strong>How to earn:</strong> {badge.criteria}
                                    </div>
                                    <div className="flex items-center justify-center space-x-2 mt-3">
                                        <StarIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-500">{badge.points} points</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BadgeSystem;
