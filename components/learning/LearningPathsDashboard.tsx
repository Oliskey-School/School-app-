import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LearningPathFull, StudentLearningPath, ModuleProgress } from '../../types-additional';
import { toast } from 'react-hot-toast';
import { AcademicCapIcon, CheckCircleIcon, PlayIcon } from '../../constants';

interface LearningPathsDashboardProps {
    studentId: number;
    isTeacher?: boolean;
    teacherId?: number;
}

const LearningPathsDashboard: React.FC<LearningPathsDashboardProps> = ({ studentId, isTeacher, teacherId }) => {
    const [paths, setPaths] = useState<LearningPathFull[]>([]);
    const [studentPaths, setStudentPaths] = useState<StudentLearningPath[]>([]);
    const [selectedPath, setSelectedPath] = useState<StudentLearningPath | null>(null);
    const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [studentId]);

    const fetchData = async () => {
        try {
            if (isTeacher) {
                // Teachers see all paths
                const { data: pathsData } = await supabase
                    .from('learning_paths')
                    .select('*, modules:learning_path_modules(*), creator:teachers(name)')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                setPaths(pathsData || []);
            } else {
                // Students see assigned paths
                const { data: studentPathsData } = await supabase
                    .from('student_learning_paths')
                    .select(`
            *,
            path:learning_paths(
              *,
              modules:learning_path_modules(*),
              creator:teachers(name)
            )
          `)
                    .eq('student_id', studentId)
                    .neq('status', 'archived');

                setStudentPaths(studentPathsData || []);
            }
        } catch (error) {
            console.error('Error fetching learning paths:', error);
            toast.error('Failed to load learning paths');
        } finally {
            setLoading(false);
        }
    };

    const assignPath = async (pathId: number) => {
        try {
            const { error } = await supabase
                .from('student_learning_paths')
                .insert({
                    student_id: studentId,
                    path_id: pathId,
                    assigned_by: teacherId,
                    status: 'assigned'
                });

            if (error) throw error;

            toast.success('Learning path assigned!');
            fetchData();
        } catch (error: any) {
            if (error.code === '23505') {
                toast.error('Path already assigned to this student');
            } else {
                toast.error('Failed to assign path');
            }
        }
    };

    const startModule = async (moduleId: number) => {
        if (!selectedPath) return;

        try {
            const { error } = await supabase
                .from('module_progress')
                .upsert({
                    student_id: studentId,
                    module_id: moduleId,
                    status: 'in_progress',
                    started_at: new Date().toISOString()
                });

            if (error) throw error;

            // Update student path status
            if (selectedPath.status === 'assigned') {
                await supabase
                    .from('student_learning_paths')
                    .update({
                        status: 'in_progress',
                        started_at: new Date().toISOString()
                    })
                    .eq('id', selectedPath.id);
            }

            toast.success('Module started!');
            fetchModuleProgress(selectedPath.id);
        } catch (error) {
            toast.error('Failed to start module');
        }
    };

    const completeModule = async (moduleId: number, score?: number) => {
        if (!selectedPath) return;

        try {
            const { error } = await supabase
                .from('module_progress')
                .update({
                    status: 'completed',
                    score: score,
                    completed_at: new Date().toISOString()
                })
                .eq('student_id', studentId)
                .eq('module_id', moduleId);

            if (error) throw error;

            // Award points if configured
            const module = selectedPath.path?.modules?.find(m => m.id === moduleId);
            if (module?.pointsReward) {
                await supabase
                    .from('point_transactions')
                    .insert({
                        student_id: studentId,
                        points: module.pointsReward,
                        reason: `Completed: ${module.title}`,
                        category: 'academic'
                    });
            }

            toast.success('Module completed! 🎉');
            fetchModuleProgress(selectedPath.id);
        } catch (error) {
            toast.error('Failed to complete module');
        }
    };

    const fetchModuleProgress = async (pathId: number) => {
        const path = studentPaths.find(p => p.id === pathId);
        if (!path) return;

        const { data } = await supabase
            .from('module_progress')
            .select('*')
            .eq('student_id', studentId)
            .in('module_id', path.path?.modules?.map(m => m.id) || []);

        setModuleProgress(data || []);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;
    }

    if (selectedPath) {
        const modules = selectedPath.path?.modules || [];

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <button
                            onClick={() => {
                                setSelectedPath(null);
                                setModuleProgress([]);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 mb-2"
                        >
                            ← Back to Paths
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800">{selectedPath.path?.name}</h2>
                        <p className="text-gray-600">{selectedPath.path?.description}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Progress</p>
                        <p className="text-3xl font-bold text-indigo-600">{selectedPath.progressPercentage}%</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all"
                            style={{ width: `${selectedPath.progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Modules */}
                <div className="space-y-4">
                    {modules.map((module, index) => {
                        const progress = moduleProgress.find(p => p.moduleId === module.id);
                        const isCompleted = progress?.status === 'completed';
                        const isInProgress = progress?.status === 'in_progress';
                        const isLocked = index > 0 && !moduleProgress.find(p => p.moduleId === modules[index - 1].id && p.status === 'completed');

                        return (
                            <div key={module.id} className={`bg-white rounded-xl p-6 shadow-sm border-2 ${isCompleted ? 'border-green-300 bg-green-50' :
                                    isInProgress ? 'border-indigo-300' :
                                        isLocked ? 'border-gray-200 opacity-60' :
                                            'border-gray-200'
                                }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-2xl">
                                                {isCompleted ? '✅' : isInProgress ? '📖' : isLocked ? '🔒' : '📚'}
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{module.title}</h3>
                                                <p className="text-sm text-gray-600">{module.description}</p>
                                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                                    <span>⏱️ {module.estimatedMinutes} min</span>
                                                    <span>🎯 {module.pointsReward} points</span>
                                                    <span className="capitalize">{module.contentType}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col space-y-2">
                                        {isCompleted ? (
                                            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                                                Completed
                                            </span>
                                        ) : isLocked ? (
                                            <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">
                                                Locked
                                            </span>
                                        ) : isInProgress ? (
                                            <button
                                                onClick={() => completeModule(module.id, 100)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                            >
                                                Mark Complete
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => startModule(module.id)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                                            >
                                                <PlayIcon className="h-4 w-4" />
                                                <span>Start</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">
                {isTeacher ? 'Learning Path Library' : 'My Learning Paths'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(isTeacher ? paths : studentPaths).map((item) => {
                    const path = isTeacher ? item as LearningPathFull : (item as StudentLearningPath).path;
                    const studentPath = !isTeacher ? item as StudentLearningPath : null;

                    return (
                        <div key={path?.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-800">{path?.name}</h3>
                                    <p className="text-sm text-gray-500 capitalize">{path?.difficultyLevel}</p>
                                </div>
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                                    {path?.subject}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{path?.description}</p>

                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                <span>⏱️ {path?.estimatedDurationHours}h</span>
                                <span>📚 {path?.modules?.length || 0} modules</span>
                            </div>

                            {isTeacher ? (
                                <button
                                    onClick={() => assignPath(path?.id || 0)}
                                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                                >
                                    Assign to Student
                                </button>
                            ) : studentPath ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Progress</span>
                                        <span className="font-semibold">{studentPath.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full"
                                            style={{ width: `${studentPath.progressPercentage}%` }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedPath(studentPath);
                                            fetchModuleProgress(studentPath.id);
                                        }}
                                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 mt-2"
                                    >
                                        Continue Learning
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {(isTeacher ? paths : studentPaths).length === 0 && (
                    <div className="col-span-full text-center py-16">
                        <AcademicCapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                            {isTeacher ? 'No learning paths created yet' : 'No learning paths assigned yet'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LearningPathsDashboard;
