import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { StarIcon, TrophyIcon, HeartIcon } from '../../constants';

interface Recognition {
    id: number;
    teacher_name: string;
    recognized_by_name: string;
    recognition_type: string;
    title: string;
    description: string;
    points: number;
    created_at: string;
}

const RecognitionPlatform: React.FC = () => {
    const { profile } = useProfile();
    const [recognitions, setRecognitions] = useState<Recognition[]>([]);
    const [myPoints, setMyPoints] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecognitions();
    }, []);

    const fetchRecognitions = async () => {
        try {
            setLoading(true);

            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) return;

            // Fetch recognitions
            const { data, error } = await supabase
                .from('teacher_recognitions')
                .select(`
          *,
          teacher:teachers!teacher_recognitions_teacher_id_fkey(full_name),
          recognizer:teachers!teacher_recognitions_recognized_by_fkey(full_name)
        `)
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const formatted: Recognition[] = (data || []).map((r: any) => ({
                id: r.id,
                teacher_name: (r.teacher as any)?.full_name || 'Unknown',
                recognized_by_name: (r.recognizer as any)?.full_name || 'Anonymous',
                recognition_type: r.recognition_type,
                title: r.title,
                description: r.description,
                points: r.points,
                created_at: r.created_at
            }));

            setRecognitions(formatted);

            // Calculate my points
            const { data: myRecs } = await supabase
                .from('teacher_recognitions')
                .select('points')
                .eq('teacher_id', teacherData.id);

            const total = (myRecs || []).reduce((sum, r) => sum + r.points, 0);
            setMyPoints(total);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Excellence': return 'bg-yellow-100 text-yellow-800';
            case 'Innovation': return 'bg-purple-100 text-purple-800';
            case 'Dedication': return 'bg-blue-100 text-blue-800';
            case 'Leadership': return 'bg-green-100 text-green-800';
            case 'Team Player': return 'bg-pink-100 text-pink-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Excellence': return '🏆';
            case 'Innovation': return '💡';
            case 'Dedication': return '💪';
            case 'Leadership': return '👑';
            case 'Team Player': return '🤝';
            default: return '⭐';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Recognition Platform</h2>
                <p className="text-sm text-gray-600 mt-1">Celebrate teacher achievements</p>
            </div>

            {/* My Points */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-yellow-100 text-sm">My Recognition Points</p>
                        <h3 className="text-4xl font-bold mt-2">{myPoints}</h3>
                        <p className="text-yellow-100 text-sm mt-2">
                            Keep up the great work!
                        </p>
                    </div>
                    <TrophyIcon className="w-12 h-12 text-yellow-200" />
                </div>
            </div>

            {/* Recent Recognitions */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Recognitions</h3>
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : recognitions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <HeartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p>No recognitions yet</p>
                        </div>
                    ) : (
                        recognitions.map(rec => (
                            <div key={rec.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="text-4xl">{getTypeIcon(rec.recognition_type)}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(rec.recognition_type)}`}>
                                                {rec.recognition_type}
                                            </span>
                                            <span className="flex items-center space-x-1 text-sm text-yellow-600">
                                                <StarIcon className="w-4 h-4" />
                                                <span>{rec.points} pts</span>
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-900">{rec.title}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                                        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-500">
                                            <span className="font-medium">{rec.teacher_name}</span>
                                            <span>•</span>
                                            <span>Recognized by {rec.recognized_by_name}</span>
                                            <span>•</span>
                                            <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecognitionPlatform;
