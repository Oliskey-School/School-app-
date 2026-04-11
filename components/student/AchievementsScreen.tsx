import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';
import { CertificateIcon, AwardIcon, StarIcon, TrophyIcon, UsersIcon, SparklesIcon } from '../../constants';

const AchievementsScreen: React.FC = () => {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAchievements = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getMyAchievements();
            setAchievements(data || []);
        } catch (error) {
            console.error("Error fetching achievements:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time synchronization
    useAutoSync(['achievements'], fetchAchievements);

    useEffect(() => {
        fetchAchievements();
    }, [fetchAchievements]);

    const categories = useMemo(() => {
        const badges = achievements.filter(a => a.type === 'Badge');
        const certificates = achievements.filter(a => a.type === 'Certificate');
        const awards = achievements.filter(a => a.type === 'Award');
        const others = achievements.filter(a => !['Badge', 'Certificate', 'Award'].includes(a.type));
        return { badges, certificates, awards, others };
    }, [achievements]);

    const getIcon = (iconName: string) => {
        switch (iconName?.toLowerCase()) {
            case 'trophy': return TrophyIcon;
            case 'star': return StarIcon;
            case 'users': return UsersIcon;
            case 'sparkles': return SparklesIcon;
            case 'award': return AwardIcon;
            case 'certificate': return CertificateIcon;
            default: return StarIcon;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading achievements...</div>;

    if (achievements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <TrophyIcon className="h-10 w-10 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No Achievements Yet</h3>
                <p className="text-gray-500 mt-2 max-w-xs">
                    Complete quizzes, participate in activities, and excel in your studies to earn badges and awards!
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                {/* Badges Section */}
                {categories.badges.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">My Badges</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {categories.badges.map(badge => {
                                const Icon = getIcon(badge.icon);
                                return (
                                    <div key={badge.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center space-y-2">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${badge.color || 'bg-blue-100 text-blue-600'}`}>
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <p className="font-bold text-xs text-gray-700 leading-tight">{badge.title}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Certificates Section */}
                    {categories.certificates.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-3">My Certificates</h2>
                            <div className="space-y-3">
                                {categories.certificates.map(cert => (
                                    <div key={cert.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                                            <CertificateIcon className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-bold text-gray-800">{cert.title}</p>
                                            <p className="text-sm text-gray-500">Issued: {new Date(cert.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Awards Section */}
                    {categories.awards.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-3">My Awards</h2>
                            <div className="space-y-3">
                                {categories.awards.map(award => (
                                    <div key={award.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0 text-yellow-500">
                                                <AwardIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{award.title}</p>
                                                <p className="text-sm text-gray-500">{new Date(award.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2 pl-10">{award.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Others / General Achievements */}
                {categories.others.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Other Achievements</h2>
                        <div className="space-y-3">
                            {categories.others.map(ach => (
                                <div key={ach.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4 border-l-4 border-indigo-400">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-indigo-50">
                                        <StarIcon className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800">{ach.title}</p>
                                        <p className="text-sm text-gray-500">{ach.description}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(ach.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AchievementsScreen;