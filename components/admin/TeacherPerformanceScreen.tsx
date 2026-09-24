import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StarIcon } from '../../constants';
import { Teacher } from '../../types';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

// Re-usable Line Chart component
const SimpleLineChart = ({ data, color }: { data: number[], color: string }) => {
    const width = 280;
    const height = 120;
    const padding = 20;
    const maxValue = 100;
    const stepX = (width - padding * 2) / (data.length - 1);
    const stepY = (height - padding * 2) / maxValue;
    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - d * stepY}`).join(' ');
    const labels = ["Term 1", "Term 2", "Term 3"];

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
                <motion.polyline
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points}
                />
                {data.map((d, i) => (
                    <motion.circle
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.5 + i * 0.1 }}
                        cx={padding + i * stepX} cy={height - padding - d * stepY} r="3" fill="white" stroke={color} strokeWidth="2"
                    />
                ))}
            </svg>
            <div className="flex justify-between -mt-2 px-5">
                {labels.map(label => <span key={label} className="text-xs text-gray-500">{label}</span>)}
            </div>
        </div>
    );
};

// Re-usable Star Rating component
const StarRating = ({ count, rating, onRatingChange }: { count: number, rating: number, onRatingChange: (newRating: number) => void }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex items-center space-x-1">
            {[...Array(count)].map((_, index) => {
                const starRating = index + 1;
                return (
                    <motion.button
                        key={starRating}
                        whileHover={{ scale: 1.25 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onRatingChange(starRating)}
                        onMouseEnter={() => setHoverRating(starRating)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${starRating} of ${count} stars`}
                        className="text-yellow-400"
                    >
                        <StarIcon filled={starRating <= (hoverRating || rating)} className="h-7 w-7" />
                    </motion.button>
                );
            })}
        </div>
    );
};


interface TeacherPerformanceScreenProps {
  teacher: Teacher;
}

const TeacherPerformanceScreen: React.FC<TeacherPerformanceScreenProps> = ({ teacher }) => {
    const { currentSchool } = useAuth();
    const [rating, setRating] = useState(4);
    const [feedback, setFeedback] = useState('');
    const [performanceData, setPerformanceData] = useState<number[]>([85, 92, 88]);
    const [loading, setLoading] = useState(false);
    
    useAutoSync(['teachers'], () => {
        console.log('🔄 [TeacherPerformance] Real-time auto-sync triggered');
        fetchEvaluation();
    });

    const fetchEvaluation = async () => {
        if (!currentSchool?.id || !teacher?.id) return;
        try {
            setLoading(true);
            const data = await api.getTeacherEvaluation?.(currentSchool.id, teacher.id);
            if (data) {
                setRating(data.rating || 4);
                setFeedback(data.feedback || '');
            }

            const performance = await api.getTeacherPerformance?.(currentSchool.id, teacher.id);
            if (performance && performance.data) {
                setPerformanceData(performance.data);
            }
        } catch (error) {
            console.error('Error fetching teacher evaluation:', error);
            toast.error('Failed to load teacher evaluation data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvaluation();
    }, [teacher?.id, currentSchool?.id]);
    
    const handleSave = async () => {
        if (!currentSchool?.id || !teacher?.id) return;
        try {
            setLoading(true);
            await api.submitTeacherEvaluation?.(teacher.id, currentSchool.id, {
                rating,
                feedback,
                performance_data: performanceData
            });
            toast.success('Evaluation submitted successfully!');
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            toast.error('Failed to submit evaluation.');
        } finally {
            setLoading(false);
        }
    };

    if (!teacher) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-sm">
                    <p className="text-gray-500 mb-4">No teacher selected for performance evaluation.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-5 overflow-y-auto">
                {/* Teacher Info */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm">
                     <img src={teacher.avatarUrl || teacher.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.full_name || teacher.name || 'User')}`} alt={teacher.full_name || teacher.name} className="w-20 h-20 rounded-full object-cover" />
                     <div>
                        <p className="font-bold text-xl text-gray-800">{teacher.full_name || teacher.name}</p>
                        <p className="font-medium text-gray-500">{teacher.subject_specialty?.[0] || teacher.subjects?.[0] || 'No subject assigned'}</p>
                     </div>
                </motion.div>

                {/* Overall Rating */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="font-bold text-gray-800">Overall Rating</h3>
                    <div className="flex items-center justify-between">
                        <StarRating count={5} rating={rating} onRatingChange={setRating} />
                        <span className="font-bold text-lg text-gray-700">{rating} / 5</span>
                    </div>
                </motion.div>

                {/* Written Feedback */}
                 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="font-bold text-gray-800">Written Feedback</h3>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Provide detailed feedback on performance, strengths, and areas for improvement..."
                        className="w-full h-28 p-3 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                        aria-label="Written feedback text area"
                    />
                </motion.div>

                {/* Term-wise Performance */}
                 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }} className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-800">Term-wise Performance Scores</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {['Term 1', 'Term 2', 'Term 3'].map((term, index) => (
                            <div key={term} className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase">{term}</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={performanceData[index] || 0}
                                    onChange={(e) => {
                                        const newData = [...performanceData];
                                        newData[index] = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                        setPerformanceData(newData);
                                    }}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sky-600 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="pt-2">
                        <SimpleLineChart data={performanceData} color="#0ea5e9" />
                    </div>
                 </motion.div>
            </main>

            {/* Action Button */}
            <div className="p-4 mt-auto bg-gray-50 border-t border-gray-200">
                <motion.button
                    whileHover={!loading ? { scale: 1.01 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Submitting...' : 'Submit Evaluation'}
                </motion.button>
            </div>
        </div>
    );
};

export default TeacherPerformanceScreen;