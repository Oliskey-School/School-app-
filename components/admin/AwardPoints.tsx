import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Student } from '../../types';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { AwardIcon, SchoolLogoIcon, CheckCircleIcon, ClockIcon } from '../../constants';

interface AwardPointsProps {
    students: Student[];
}

const AwardPoints: React.FC<AwardPointsProps> = ({ students }) => {
    const { currentSchool } = useAuth();
    const schoolId = currentSchool?.id;
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [points, setPoints] = useState<number>(10);
    const [reason, setReason] = useState('');
    const [category, setCategory] = useState<'academic' | 'behavior' | 'attendance' | 'participation'>('academic');
    const [submitting, setSubmitting] = useState(false);

    const toggleStudent = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const awardPoints = async () => {
        if (selectedStudents.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        if (!reason.trim()) {
            toast.error('Please provide a reason');
            return;
        }

        if (!schoolId) {
            toast.error('School context missing.');
            return;
        }

        setSubmitting(true);

        try {
            const user = (await supabase.auth.getUser()).data.user;

            // Create transactions for each student
            const transactions = selectedStudents.map(studentId => ({
                student_id: studentId,
                school_id: schoolId,
                points: points,
                reason: reason,
                category: category,
                awarded_by: user?.id
            }));

            const { error: transError } = await supabase
                .from('point_transactions')
                .insert(transactions);

            if (transError) throw transError;

            // Update each student's points
            for (const studentId of selectedStudents) {
                const { data: currentPoints } = await supabase
                    .from('student_points')
                    .select('points, total_earned')
                    .eq('student_id', studentId)
                    .single();

                if (currentPoints) {
                    await supabase
                        .from('student_points')
                        .update({
                            points: currentPoints.points + points,
                            total_earned: currentPoints.total_earned + points
                        })
                        .eq('student_id', studentId);
                } else {
                    // Create if doesn't exist
                    await supabase
                        .from('student_points')
                        .insert({
                            student_id: studentId,
                            school_id: schoolId,
                            points: points,
                            total_earned: points,
                            level: 1
                        });
                }
            }

            toast.success(`Awarded ${points} points to ${selectedStudents.length} student(s)!`);

            // Reset form
            setSelectedStudents([]);
            setReason('');
            setPoints(10);
        } catch (error) {
            console.error('Error awarding points:', error);
            toast.error('Failed to award points');
        } finally {
            setSubmitting(false);
        }
    };

    const quickReasons = [
        { label: 'Perfect Attendance', points: 50, category: 'attendance' as const },
        { label: 'Top Score in Test', points: 100, category: 'academic' as const },
        { label: 'Excellent Behavior', points: 30, category: 'behavior' as const },
        { label: 'Class Participation', points: 20, category: 'participation' as const },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
                <div className="flex items-center space-x-3">
                    <AwardIcon className="h-8 w-8" />
                    <h2 className="text-2xl font-bold">Award Points</h2>
                </div>
                <p className="mt-2 opacity-90">Reward students for their achievements</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Quick Award</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickReasons.map((quick) => (
                        <button
                            key={quick.label}
                            onClick={() => {
                                setReason(quick.label);
                                setPoints(quick.points);
                                setCategory(quick.category);
                            }}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
                        >
                            <p className="font-semibold text-sm text-gray-800">{quick.label}</p>
                            <p className="text-xl font-bold text-indigo-600 mt-1">+{quick.points}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-800">Award Details</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                        <input
                            type="number"
                            value={points}
                            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            min="1"
                            step="10"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as any)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="academic">Academic</option>
                            <option value="behavior">Behavior</option>
                            <option value="attendance">Attendance</option>
                            <option value="participation">Participation</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            rows={3}
                            placeholder="Why are you awarding these points?"
                        />
                    </div>

                    <button
                        onClick={awardPoints}
                        disabled={submitting || selectedStudents.length === 0 || !reason}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                <span>Awarding...</span>
                            </>
                        ) : (
                            <>
                                <AwardIcon className="h-5 w-5" />
                                <span>Award to {selectedStudents.length} Student(s)</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Student Selection */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">
                        Select Students ({selectedStudents.length} selected)
                    </h3>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {students.map((student) => (
                            <button
                                key={student.id}
                                onClick={() => toggleStudent(student.id)}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${selectedStudents.includes(student.id)
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{student.name}</p>
                                            <p className="text-xs text-gray-500">Grade {student.grade}{student.section}</p>
                                        </div>
                                    </div>
                                    {selectedStudents.includes(student.id) && (
                                        <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AwardPoints;
