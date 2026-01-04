import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    SearchIcon,
    SchoolLogoIcon,
    ClockIcon,
    PlayIcon,
    StarIcon
} from '../../constants';

interface Course {
    id: number;
    title: string;
    description: string;
    category: string;
    level: string;
    duration_hours: number;
    instructor: string;
    thumbnail_url: string;
    is_enrolled: boolean;
}

interface CourseCatalogProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const CourseCatalog: React.FC<CourseCatalogProps> = ({ navigateTo }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('all');
    const [level, setLevel] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [courses, searchTerm, category, level]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pd_courses')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted: Course[] = (data || []).map((c: any) => ({
                id: c.id,
                title: c.title,
                description: c.description,
                category: c.category,
                level: c.level,
                duration_hours: c.duration_hours,
                instructor: c.instructor,
                thumbnail_url: c.thumbnail_url,
                is_enrolled: false
            }));

            setCourses(formatted);
        } catch (error: any) {
            console.error('Error fetching courses:', error);
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...courses];

        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(search) ||
                c.description.toLowerCase().includes(search) ||
                c.instructor.toLowerCase().includes(search)
            );
        }

        if (category !== 'all') {
            filtered = filtered.filter(c => c.category === category);
        }

        if (level !== 'all') {
            filtered = filtered.filter(c => c.level === level);
        }

        setFilteredCourses(filtered);
    };

    const handleEnroll = async (courseId: number) => {
        try {
            // Get teacher ID from current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Please log in');
                return;
            }

            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!teacherData) {
                toast.error('Teacher profile not found');
                return;
            }

            const { error } = await supabase
                .from('teacher_course_enrollments')
                .insert({
                    teacher_id: teacherData.id,
                    course_id: courseId,
                    status: 'In Progress'
                });

            if (error) throw error;

            toast.success('Enrolled in course successfully!');
            fetchCourses();
        } catch (error: any) {
            console.error('Error enrolling:', error);
            toast.error('Failed to enroll in course');
        }
    };

    const categories = [...new Set(courses.map(c => c.category))];
    const levels = ['Beginner', 'Intermediate', 'Advanced'];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Course Catalog</h2>
                <p className="text-sm text-gray-600 mt-1">Browse and enroll in professional development courses</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search courses..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="all">All Levels</option>
                        {levels.map((lv) => (
                            <option key={lv} value={lv}>{lv}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <SchoolLogoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No courses found</p>
                    </div>
                ) : (
                    filteredCourses.map((course) => (
                        <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-40 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                                <SchoolLogoIcon className="w-16 h-16 text-white opacity-50" />
                            </div>

                            <div className="p-6">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                        {course.category}
                                    </span>
                                    <span className="text-xs text-gray-500">{course.level}</span>
                                </div>

                                <h3 className="font-bold text-gray-900 mb-2">{course.title}</h3>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                                    <div className="flex items-center space-x-1">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>{course.duration_hours}h</span>
                                    </div>
                                    <span className="text-xs">By {course.instructor}</span>
                                </div>

                                <button
                                    onClick={() => handleEnroll(course.id)}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center space-x-2"
                                >
                                    <PlayIcon className="w-4 h-4" />
                                    <span>Enroll Now</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CourseCatalog;
