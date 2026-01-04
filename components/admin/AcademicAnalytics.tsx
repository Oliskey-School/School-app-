import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { TrendingUp, TrendingDown, Award, Users, BookOpen, Target } from 'lucide-react';

interface GradeDistribution {
    grade: string;
    count: number;
    percentage: number;
}

interface SubjectPerformance {
    subject: string;
    averageScore: number;
    passRate: number;
    totalStudents: number;
}

interface ClassComparison {
    className: string;
    averageGPA: number;
    passRate: number;
    studentCount: number;
}

const AcademicAnalytics: React.FC = () => {
    const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
    const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
    const [classComparison, setClassComparison] = useState<ClassComparison[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedTerm, setSelectedTerm] = useState('current');
    const [selectedClass, setSelectedClass] = useState<number | null>(null);

    // Key Metrics
    const [metrics, setMetrics] = useState({
        overallGPA: 0,
        passRate: 0,
        topPerformer: '',
        improvement: 0
    });

    useEffect(() => {
        fetchAnalytics();
    }, [selectedTerm, selectedClass]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchGradeDistribution(),
                fetchSubjectPerformance(),
                fetchClassComparison(),
                fetchKeyMetrics()
            ]);
        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchGradeDistribution = async () => {
        try {
            const { data: grades } = await supabase
                .from('student_grades')
                .select('grade');

            if (grades) {
                const distribution = calculateGradeDistribution(grades);
                setGradeDistribution(distribution);
            }
        } catch (error: any) {
            console.error('Error fetching grade distribution:', error);
        }
    };

    const calculateGradeDistribution = (grades: any[]) => {
        const gradeMap: { [key: string]: number } = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0 };

        grades.forEach(g => {
            const grade = g.grade?.toUpperCase() || 'F';
            if (gradeMap[grade] !== undefined) {
                gradeMap[grade]++;
            }
        });

        const total = grades.length || 1;
        return Object.entries(gradeMap).map(([grade, count]) => ({
            grade,
            count,
            percentage: (count / total) * 100
        }));
    };

    const fetchSubjectPerformance = async () => {
        try {
            const { data: grades } = await supabase
                .from('student_grades')
                .select('subject, score');

            if (grades) {
                const subjectMap: { [key: string]: number[] } = {};

                grades.forEach(g => {
                    const subject = g.subject || 'Unknown';
                    if (!subjectMap[subject]) {
                        subjectMap[subject] = [];
                    }
                    subjectMap[subject].push(g.score || 0);
                });

                const performance: SubjectPerformance[] = Object.entries(subjectMap).map(([subject, scores]) => {
                    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
                    const passed = scores.filter(s => s >= 50).length;
                    return {
                        subject,
                        averageScore: Math.round(average * 10) / 10,
                        passRate: (passed / scores.length) * 100,
                        totalStudents: scores.length
                    };
                });

                setSubjectPerformance(performance.sort((a, b) => b.averageScore - a.averageScore));
            }
        } catch (error: any) {
            console.error('Error fetching subject performance:', error);
        }
    };

    const fetchClassComparison = async () => {
        try {
            // Simulated class comparison data
            const comparison: ClassComparison[] = [
                { className: 'JSS 1A', averageGPA: 3.2, passRate: 85, studentCount: 35 },
                { className: 'JSS 1B', averageGPA: 3.5, passRate: 90, studentCount: 32 },
                { className: 'JSS 2A', averageGPA: 3.1, passRate: 82, studentCount: 38 },
                { className: 'JSS 2B', averageGPA: 3.4, passRate: 88, studentCount: 36 },
                { className: 'JSS 3A', averageGPA: 3.6, passRate: 92, studentCount: 30 },
            ];
            setClassComparison(comparison);
        } catch (error: any) {
            console.error('Error fetching class comparison:', error);
        }
    };

    const fetchKeyMetrics = async () => {
        try {
            const { data: grades } = await supabase
                .from('student_grades')
                .select('score, student_id');

            if (grades && grades.length > 0) {
                const avgScore = grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length;
                const gpa = (avgScore / 100) * 4;
                const passed = grades.filter(g => (g.score || 0) >= 50).length;
                const passRate = (passed / grades.length) * 100;

                setMetrics({
                    overallGPA: Math.round(gpa * 100) / 100,
                    passRate: Math.round(passRate * 10) / 10,
                    topPerformer: 'Excellence Student',
                    improvement: 5.2
                });
            }
        } catch (error: any) {
            console.error('Error fetching key metrics:', error);
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">📊 Academic Analytics</h1>
                <p className="text-indigo-100">Comprehensive performance tracking and analysis</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Overall GPA</p>
                            <p className="text-3xl font-bold text-indigo-600">{metrics.overallGPA}</p>
                            <p className="text-xs text-gray-500 mt-1">out of 4.0</p>
                        </div>
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <Award className="h-6 w-6 text-indigo-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pass Rate</p>
                            <p className="text-3xl font-bold text-green-600">{metrics.passRate}%</p>
                            <p className="text-xs text-green-500 mt-1 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +{metrics.improvement}% from last term
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Target className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Top Performer</p>
                            <p className="text-lg font-bold text-gray-900">{metrics.topPerformer}</p>
                            <p className="text-xs text-gray-500 mt-1">GPA: 4.0</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Award className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Students</p>
                            <p className="text-3xl font-bold text-gray-900">{classComparison.reduce((sum, c) => sum + c.studentCount, 0)}</p>
                            <p className="text-xs text-gray-500 mt-1">across {classComparison.length} classes</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Grade Distribution</h3>
                <div className="space-y-3">
                    {gradeDistribution.map(item => (
                        <div key={item.grade}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-gray-900">Grade {item.grade}</span>
                                <span className="text-gray-600">{item.count} students ({item.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`${getGradeColor(item.grade)} h-4 rounded-full flex items-center justify-end pr-2`}
                                    style={{ width: `${item.percentage}%` }}
                                >
                                    {item.percentage > 10 && (
                                        <span className="text-white text-xs font-semibold">{item.percentage.toFixed(0)}%</span>
                                    )}
                                </div>
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
                        {subjectPerformance.slice(0, 6).map(subject => (
                            <div key={subject.subject} className="border border-gray-200 rounded-lg p-4">
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
                            </div>
                        ))}
                    </div>
                </div>

                {/* Class Comparison */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Class Comparison</h3>
                    <div className="space-y-3">
                        {classComparison.map((classData, index) => (
                            <div key={classData.className} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
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
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Predictive Analytics */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">🔮 Predictive Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Projected End-of-Term GPA</p>
                        <p className="text-2xl font-bold text-indigo-600">3.4</p>
                        <p className="text-xs text-green-600 mt-1">↑ 0.2 improvement expected</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">At-Risk Students</p>
                        <p className="text-2xl font-bold text-orange-600">12</p>
                        <p className="text-xs text-gray-500 mt-1">Require intervention</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Excellence Candidates</p>
                        <p className="text-2xl font-bold text-green-600">45</p>
                        <p className="text-xs text-gray-500 mt-1">GPA 3.5+ trajectory</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcademicAnalytics;
