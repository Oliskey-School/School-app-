import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    CheckCircleIcon,
    PlayIcon,
    DocumentTextIcon,
    ChevronRightIcon
} from '../../constants';

interface Module {
    id: number;
    title: string;
    description: string;
    order_index: number;
    content_type: string;
    duration_minutes: number;
    is_completed: boolean;
}

interface CoursePlayerProps {
    courseId: number;
    enrollmentId: number;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ courseId, enrollmentId }) => {
    const [modules, setModules] = useState<Module[]>([]);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchModules();
    }, [courseId]);

    const fetchModules = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('course_modules')
                .select('*')
                .eq('course_id', courseId)
                .order('order_index');

            if (error) throw error;

            const formatted: Module[] = (data || []).map((m: any) => ({
                id: m.id,
                title: m.title,
                description: m.description,
                order_index: m.order_index,
                content_type: m.content_type,
                duration_minutes: m.duration_minutes,
                is_completed: false
            }));

            setModules(formatted);
            if (formatted.length > 0) {
                setSelectedModule(formatted[0]);
            }
        } catch (error: any) {
            console.error('Error fetching modules:', error);
            toast.error('Failed to load course modules');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteModule = async (moduleId: number) => {
        try {
            const { error } = await supabase
                .from('module_progress')
                .upsert({
                    enrollment_id: enrollmentId,
                    module_id: moduleId,
                    is_completed: true,
                    completed_at: new Date().toISOString()
                }, {
                    onConflict: 'enrollment_id,module_id'
                });

            if (error) throw error;

            setModules(modules.map(m =>
                m.id === moduleId ? { ...m, is_completed: true } : m
            ));

            toast.success('Module completed!');

            // Auto-select next module
            const currentIndex = modules.findIndex(m => m.id === moduleId);
            if (currentIndex < modules.length - 1) {
                setSelectedModule(modules[currentIndex + 1]);
            }
        } catch (error: any) {
            console.error('Error completing module:', error);
            toast.error('Failed to mark module as complete');
        }
    };

    const completedCount = modules.filter(m => m.is_completed).length;
    const progressPercentage = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Course Progress</span>
                    <span>{progressPercentage}% Complete ({completedCount}/{modules.length} modules)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-green-600 h-3 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Module List */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-900 mb-4">Course Modules</h3>
                    <div className="space-y-2">
                        {modules.map((module) => (
                            <button
                                key={module.id}
                                onClick={() => setSelectedModule(module)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${selectedModule?.id === module.id
                                        ? 'bg-indigo-50 border-2 border-indigo-500'
                                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="flex items-start space-x-2">
                                    {module.is_completed ? (
                                        <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                                    ) : (
                                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full mt-0.5"></div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-900">{module.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">{module.duration_minutes} min</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Module Content */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                    {selectedModule ? (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                        {selectedModule.content_type}
                                    </span>
                                    <span className="text-sm text-gray-500">{selectedModule.duration_minutes} minutes</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">{selectedModule.title}</h2>
                                <p className="text-gray-600 mt-2">{selectedModule.description}</p>
                            </div>

                            {/* Placeholder Content Area */}
                            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                                {selectedModule.content_type === 'Video' && (
                                    <div className="text-center text-white">
                                        <PlayIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p>Video Player Placeholder</p>
                                        <p className="text-sm text-gray-400 mt-2">Video content would load here</p>
                                    </div>
                                )}
                                {selectedModule.content_type === 'Reading' && (
                                    <div className="text-center text-white">
                                        <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p>Reading Material Placeholder</p>
                                        <p className="text-sm text-gray-400 mt-2">Reading content would load here</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between">
                                <button
                                    disabled={selectedModule.order_index === 1}
                                    onClick={() => {
                                        const prevModule = modules[selectedModule.order_index - 2];
                                        if (prevModule) setSelectedModule(prevModule);
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                                >
                                    Previous
                                </button>

                                {!selectedModule.is_completed && (
                                    <button
                                        onClick={() => handleCompleteModule(selectedModule.id)}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        <span>Mark as Complete</span>
                                    </button>
                                )}

                                <button
                                    disabled={selectedModule.order_index === modules.length}
                                    onClick={() => {
                                        const nextModule = modules[selectedModule.order_index];
                                        if (nextModule) setSelectedModule(nextModule);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
                                >
                                    <span>Next</span>
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p>Select a module to begin learning</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoursePlayer;
