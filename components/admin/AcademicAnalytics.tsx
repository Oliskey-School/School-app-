import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useAutoSync } from '../../hooks/useAutoSync';
import { TrendingUp, Target, TrendingDown, Award, Users, AlertTriangle, Star } from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

const CANONICAL_TERMS = ['First Term', 'Second Term', 'Third Term'];

interface GradeDistribution {
    grade: string;
    count: number;
    percentage: number;
}

interface SubjectPerformance {
    subject: string;
    totalStudents: number;
    averageScore: number;
    passRate: number;
}

interface ClassComparison {
    className: string;
    studentCount: number;
    averageGPA: number;
    passRate: number;
}

interface AcademicAnalyticsProps {
    schoolId: string;
    currentBranchId?: string | null;
}

const AcademicAnalytics: React.FC<AcademicAnalyticsProps> = ({ schoolId, currentBranchId }) => {
    const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
    const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
    const [classComparison, setClassComparison] = useState<ClassComparison[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedTerm, setSelectedTerm] = useState('current');
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);

    // Key Metrics
    const [metrics, setMetrics] = useState({
        overallGPA: 0,
        passRate: 0,
        topPerformer: '',
        topPerformerGPA: 0,
        improvement: 0
    });

    useEffect(() => {
        if (schoolId) {
            fetchAnalytics();
        }
    }, [selectedTerm, selectedClass, schoolId, currentBranchId]);

    useEffect(() => {
        if (!schoolId) return;
        api.getClasses(schoolId, currentBranchId || undefined)
            .then((data: any[]) => setClassOptions((data || []).map(c => ({ id: c.id, name: c.name }))))
            .catch(() => setClassOptions([]));
    }, [schoolId, currentBranchId]);

    useAutoSync(['academic_results', 'student_results', 'attendance', 'students', 'classes'], () => {
        console.log('🔄 [AcademicAnalytics] Real-time auto-sync triggered');
        fetchAnalytics();
    });

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const data = await api.getAcademicAnalytics(schoolId, currentBranchId || undefined, selectedTerm, selectedClass || undefined);

            if (data) {
                setGradeDistribution(data.gradeDistribution || []);
                setSubjectPerformance(data.subjectPerformance || []);
                setClassComparison(data.classComparison || []);
                setMetrics(data.metrics || {
                    overallGPA: 0,
                    passRate: 0,
                    topPerformer: 'N/A',
                    topPerformerGPA: 0,
                    improvement: 0
                });
            }
        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade: string) => {
        const colors: { [key: string]: string } = {
            'A': 'bg-green-500',
            'B': 'bg-blue-500',
            'C': 'bg-yellow-500',
            'D': 'bg-orange-500',
            'E': 'bg-red-400',
            'F': 'bg-red-600'
        };
        return colors[grade] || 'bg-gray-500';
    };

    const getPerformanceIcon = (rate: number) => {
        if (rate >= 80) return <TrendingUp className="h-5 w-5 text-green-600" />;
        if (rate >= 60) return <Target className="h-5 w-5 text-yellow-600" />;
        return <TrendingDown className="h-5 w-5 text-red-600" />;
    };

    // Honestly-derivable "predictive" stats — computed from the same real
    // classComparison/metrics data already on screen, not fabricated numbers.
    const atRiskClasses = classComparison.filter(c => c.passRate < 60);
    const topClasses = classComparison.filter(c => c.averageGPA >= 3.5);
    const projectedGPA = Math.max(0, Math.min(4, metrics.overallGPA * (1 + metrics.improvement / 100)));

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">📊 Academic Analytics</h1>
                <p className="text-indigo-100 text-sm sm:text-base">Comprehensive performance tracking and analysis</p>
            </motion.div>

            {/* Filters */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Term</label>
                        <div className="flex flex-wrap gap-2">
                            {(['current', ...CANONICAL_TERMS] as const).map(term => (
                                <motion.button
                                    key={term}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedTerm(term)}
                                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold ${selectedTerm === term ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    {term === 'current' ? 'All Terms' : term}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                    <div className="sm:ml-auto">
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Class</label>
                        <select
                            value={selectedClass || 'all'}
                            onChange={(e) => setSelectedClass(e.target.value === 'all' ? null : e.target.value)}
                            className="w-full sm:w-56 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Classes</option>
                            {classOptions.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </motion.div>

            {loading ? (
                <CenteredLoader className="h-64" />
            ) : (
            <AnimatePresence mode="wait">
            <motion.div key={`${selectedTerm}-${selectedClass}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0 }} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600">Overall GPA</p>
                            <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{metrics.overallGPA}</p>
                            <p className="text-xs sm:text-xs text-gray-500 mt-1">out of 4.0</p>
                        </div>
                        <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg">
                            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600">Pass Rate</p>
                            <p className="text-2xl sm:text-3xl font-bold text-green-600">{metrics.passRate}%</p>
                            <p className="text-xs sm:text-xs text-green-500 mt-1 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +{metrics.improvement}% from last term
                            </p>
                        </div>
                        <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600">Top Performer</p>
                            <p className="text-base sm:text-lg font-bold text-gray-900 truncate max-w-[120px] sm:max-w-none">{metrics.topPerformer}</p>
                            <p className="text-xs sm:text-xs text-gray-500 mt-1">GPA: {metrics.topPerformerGPA || '—'}</p>
                        </div>
                        <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-gray-600">Total Students</p>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{classComparison.reduce((sum, c) => sum + c.studentCount, 0)}</p>
                            <p className="text-xs sm:text-xs text-gray-500 mt-1">across {classComparison.length} classes</p>
                        </div>
                        <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Grade Distribution</h3>
                <div className="space-y-3">
                    {gradeDistribution.map((item, gi) => (
                        <div key={item.grade}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-gray-900">Grade {item.grade}</span>
                                <span className="text-gray-600">{item.count} students ({item.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.percentage}%` }}
                                    transition={{ duration: 0.5, delay: gi * 0.05, ease: 'easeOut' }}
                                    className={`${getGradeColor(item.grade)} h-4 rounded-full flex items-center justify-end pr-2`}
                                >
                                    {item.percentage > 10 && (
                                        <span className="text-white text-xs font-semibold">{item.percentage.toFixed(0)}%</span>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subject Performance & Class Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject Performance */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📚 Subject Performance</h3>
                    <div className="space-y-3">
                        {subjectPerformance.length === 0 && (
                            <p className="text-center text-gray-400 py-8 text-sm">No results recorded for this term/class yet.</p>
                        )}
                        {subjectPerformance.slice(0, 6).map((subject, si) => (
                            <motion.div
                                key={subject.subject}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: si * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-colors"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{subject.subject}</h4>
                                        <p className="text-xs text-gray-500">{subject.totalStudents} students</p>
                                    </div>
                                    {getPerformanceIcon(subject.passRate)}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Avg Score</p>
                                        <p className="text-lg font-bold text-indigo-600">{subject.averageScore}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Pass Rate</p>
                                        <p className="text-lg font-bold text-green-600">{subject.passRate.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Class Comparison */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Class Comparison</h3>
                    <div className="space-y-3">
                        {classComparison.length === 0 && (
                            <p className="text-center text-gray-400 py-8 text-sm">No results recorded for this term/class yet.</p>
                        )}
                        {classComparison.map((classData, index) => (
                            <motion.div
                                key={classData.className}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-indigo-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{classData.className}</h4>
                                            <p className="text-xs text-gray-500">{classData.studentCount} students</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-xs text-gray-600">Avg GPA</p>
                                        <p className="text-lg font-bold text-indigo-600">{classData.averageGPA}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-xs text-gray-600">Pass Rate</p>
                                        <p className="text-lg font-bold text-green-600">{classData.passRate}%</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Predictive Analytics — every figure here is derived from the real
                data already fetched above (classComparison + metrics.improvement),
                not a fabricated placeholder. */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 sm:p-6 mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">🔮 Trend Insights</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Projected GPA (at current trend)</p>
                        <p className="text-2xl font-bold text-indigo-600">{projectedGPA.toFixed(1)}</p>
                        <p className={`text-xs mt-1 ${metrics.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.improvement >= 0 ? '↑' : '↓'} {Math.abs(metrics.improvement)}% vs. previous term
                        </p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.06 }} className="bg-white rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <p className="text-sm text-gray-600">At-Risk Classes</p>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">{atRiskClasses.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Pass rate under 60%</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.12 }} className="bg-white rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Star className="h-4 w-4 text-green-500" />
                            <p className="text-sm text-gray-600">Top-Performing Classes</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{topClasses.length}</p>
                        <p className="text-xs text-gray-500 mt-1">GPA 3.5+</p>
                    </motion.div>
                </div>
            </div>
            </motion.div>
            </AnimatePresence>
            )}
        </div>
    );
};

export default AcademicAnalytics;
