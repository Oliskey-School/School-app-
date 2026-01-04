import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import {
    SchoolLogoIcon,
    CheckCircleIcon,
    ClockIcon,
    ChartBarIcon,
    StarIcon
} from '../../constants';

interface EnrolledCourse {
    id: number;
    enrollment_id: number;
    title: string;
    description: string;
    instructor: string;
    duration_hours: number;
    progress_percentage: number;
    status: string;
    enrolled_at: string;
}

const MyPDCourses: React.FC = () => {
    const { profile } = useProfile();
    const [courses, setCourses] = useState<EnrolledCourse[]>([]);
    const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEnrolledCourses();
    }, []);

    const fetchEnrolledCourses = async () => {
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

            const { data, error } = await supabase
                .from('teacher_course_enrollments')
                .select(`
          id,
          progress_percentage,
          status,
          enrolled_at,
          pd_courses (
            id,
            title,
            description,
            instructor,
            duration_hours
          )
        `)
                .eq('teacher_id', teacherData.id)
                .order('enrolled_at', { ascending: false });

            if (error) throw error;

            const formatted: EnrolledCourse[] = (data || []).map((item: any) => ({
                id: item.pd_courses?.id || 0,
                enrollment_id: item.id,
                title: item.pd_courses?.title || 'Unknown',
                description: item.pd_courses?.description || '',
                instructor: item.pd_courses?.instructor || '',
                duration_hours: item.pd_courses?.duration_hours || 0,
                progress_percentage: item.progress_percentage,
                status: item.status,
                enrolled_at: item.enrolled_at
            }));

            setCourses(formatted);
        } catch (error: any) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(c => {
        if (filter === 'all') return true;
        if (filter === 'in-progress') return c.status === 'In Progress';
        if (filter === 'completed') return c.status === 'Completed';
        return true;
    });

    const stats = {
        total: courses.length,
        inProgress: courses.filter(c => c.status === 'In Progress').length,
        completed: courses.filter(c => c.status === 'Completed').length
    };

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
                <h2 className="text-2xl font-bold text-gray-900">My PD Courses</h2>
                <p className="text-sm text-gray-600 mt-1">Track your professional development progress</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700">In Progress</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.inProgress}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700">Completed</p>
                    <p className="text-2xl font-bold text-green-800">{stats.completed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                {(['all', 'in-progress', 'completed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Courses List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCourses.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <SchoolLogoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No courses found</p>
                        <p className="text-sm mt-2">Enroll in courses from the Course Catalog</p>
                    </div>
                ) : (
                    filteredCourses.map((course) => (
                        <div key={course.enrollment_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{course.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">By {course.instructor}</p>
                                </div>
                                {course.status === 'Completed' && (
                                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                )}
                            </div>

                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Progress</span>
                                    <span>{course.progress_percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full transition-all"
                                        style={{ width: `${course.progress_percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-1 text-gray-600">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>{course.duration_hours}h</span>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${course.status === 'Completed'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {course.status}
                                </span>
                            </div>

                            {course.status !== 'Completed' && (
                                <button
                                    className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    Continue Learning
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MyPDCourses;
