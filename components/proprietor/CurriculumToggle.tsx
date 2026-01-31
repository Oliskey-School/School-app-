import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Premium CurriculumToggle Component
 * For Proprietor: View performance across Nigerian, British, and American curricula
 * Design: 3D flip cards with Apple-level polish
 */

interface CurriculumStats {
    code: string;
    name: string;
    totalStudents: number;
    activeClasses: number;
    subjects: number;
    averagePerformance: number;
}

export const CurriculumToggle: React.FC<{ schoolId: string }> = ({ schoolId }) => {
    const [selectedCurriculum, setSelectedCurriculum] = useState<string>('all');
    const [stats, setStats] = useState<CurriculumStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCurriculumStats();
    }, [schoolId]);

    const loadCurriculumStats = async () => {
        try {
            // Fetch curriculum-specific stats
            const { data: standards } = await supabase
                .from('curriculum_standards')
                .select('id, code, name');

            if (!standards) return;

            const statsPromises = standards.map(async (standard) => {
                // Get branches using this curriculum
                const { data: branches } = await supabase
                    .from('school_branches')
                    .select('id')
                    .eq('school_id', schoolId)
                    .eq('curriculum_type', standard.code.toLowerCase().split('_')[0]);

                const branchIds = branches?.map(b => b.id) || [];

                // Get stats for this curriculum
                const { count: studentCount } = await supabase
                    .from('students')
                    .select('*', { count: 'exact', head: true })
                    .in('branch_id', branchIds);

                const { count: subjectCount } = await supabase
                    .from('curriculum_subjects')
                    .select('*', { count: 'exact', head: true })
                    .eq('standard_id', standard.id);

                return {
                    code: standard.code,
                    name: standard.name,
                    totalStudents: studentCount || 0,
                    activeClasses: branchIds.length,
                    subjects: subjectCount || 0,
                    averagePerformance: Math.random() * 30 + 70 // Mock for now
                };
            });

            const curriculumStats = await Promise.all(statsPromises);
            setStats(curriculumStats);
        } catch (error) {
            console.error('Error loading curriculum stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getCurriculumIcon = (code: string) => {
        if (code.includes('NERDC')) return '🇳🇬';
        if (code.includes('UK')) return '🇬🇧';
        if (code.includes('US')) return '🇺🇸';
        return '🌍';
    };

    const getCurriculumColor = (code: string) => {
        if (code.includes('NERDC')) return {
            gradient: 'from-green-500 to-emerald-600',
            bg: 'bg-green-500/10',
            border: 'border-green-500/30',
            text: 'text-green-600'
        };
        if (code.includes('UK')) return {
            gradient: 'from-blue-500 to-indigo-600',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-600'
        };
        if (code.includes('US')) return {
            gradient: 'from-red-500 to-rose-600',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-600'
        };
        return {
            gradient: 'from-gray-500 to-slate-600',
            bg: 'bg-gray-500/10',
            border: 'border-gray-500/30',
            text: 'text-gray-600'
        };
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Academic Overview
                </h2>
                <p className="text-gray-600 text-sm">
                    Multi-curriculum performance across all branches
                </p>
            </div>

            {/* Curriculum Selector */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setSelectedCurriculum('all')}
                    className={`
                        px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap
                        transition-all duration-300
                        ${selectedCurriculum === 'all'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                        }
                    `}
                >
                    🌍 All Curricula
                </button>
                {stats.map((curriculum) => {
                    const colors = getCurriculumColor(curriculum.code);
                    return (
                        <button
                            key={curriculum.code}
                            onClick={() => setSelectedCurriculum(curriculum.code)}
                            className={`
                                px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap
                                transition-all duration-300
                                ${selectedCurriculum === curriculum.code
                                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg scale-105`
                                    : `bg-white ${colors.text} border ${colors.border} hover:scale-105`
                                }
                            `}
                        >
                            {getCurriculumIcon(curriculum.code)} {curriculum.name.split(' ')[0]}
                        </button>
                    );
                })}
            </div>

            {/* Stats Cards Grid - 3D Effect */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats
                    .filter(s => selectedCurriculum === 'all' || s.code === selectedCurriculum)
                    .map((curriculum, index) => {
                        const colors = getCurriculumColor(curriculum.code);
                        return (
                            <div
                                key={curriculum.code}
                                className="group perspective-1000"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="
                                    relative preserve-3d transition-all duration-500
                                    hover:rotate-y-180
                                ">
                                    {/* Front Face */}
                                    <div className={`
                                        backface-hidden
                                        bg-white rounded-3xl p-6
                                        border-2 ${colors.border}
                                        shadow-xl shadow-black/5
                                        hover:shadow-2xl hover:shadow-black/10
                                        transition-all duration-300
                                    `}>
                                        {/* Icon & Title */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`
                                                w-14 h-14 rounded-2xl
                                                bg-gradient-to-br ${colors.gradient}
                                                flex items-center justify-center
                                                text-3xl
                                                shadow-lg
                                            `}>
                                                {getCurriculumIcon(curriculum.code)}
                                            </div>
                                            <div className={`
                                                px-3 py-1 rounded-full
                                                ${colors.bg} ${colors.text}
                                                text-xs font-bold
                                            `}>
                                                {curriculum.activeClasses} Branch{curriculum.activeClasses !== 1 ? 'es' : ''}
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            {curriculum.name.split(' (')[0]}
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-6">
                                            {curriculum.code}
                                        </p>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`p-3 rounded-xl ${colors.bg}`}>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {curriculum.totalStudents}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Students
                                                </div>
                                            </div>
                                            <div className={`p-3 rounded-xl ${colors.bg}`}>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {curriculum.subjects}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Subjects
                                                </div>
                                            </div>
                                        </div>

                                        {/* Performance Bar */}
                                        <div className="mt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-gray-600">Avg Performance</span>
                                                <span className={`text-sm font-bold ${colors.text}`}>
                                                    {curriculum.averagePerformance.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-1000`}
                                                    style={{ width: `${curriculum.averagePerformance}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Hover Hint */}
                                        <div className="mt-4 text-center">
                                            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Hover for details
                                            </span>
                                        </div>
                                    </div>

                                    {/* Back Face (3D Flip) */}
                                    <div className={`
                                        absolute inset-0 backface-hidden rotate-y-180
                                        bg-gradient-to-br ${colors.gradient}
                                        rounded-3xl p-6
                                        shadow-2xl
                                        text-white
                                    `}>
                                        <h4 className="text-lg font-bold mb-4">
                                            Detailed Insights
                                        </h4>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="opacity-90">Total Enrollment:</span>
                                                <span className="font-bold">{curriculum.totalStudents} students</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="opacity-90">Active Subjects:</span>
                                                <span className="font-bold">{curriculum.subjects} courses</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="opacity-90">Branches:</span>
                                                <span className="font-bold">{curriculum.activeClasses} locations</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="opacity-90">Performance:</span>
                                                <span className="font-bold">{curriculum.averagePerformance.toFixed(1)}%</span>
                                            </div>
                                        </div>

                                        <button className="
                                            mt-6 w-full py-2 px-4
                                            bg-white/20 hover:bg-white/30
                                            rounded-xl font-medium text-sm
                                            transition-all duration-200
                                            backdrop-blur-sm
                                        ">
                                            View Full Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default CurriculumToggle;
