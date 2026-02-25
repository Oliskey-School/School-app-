import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Award, TrendingUp, BookOpen, Download, FileText, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudentProfileProps {
    studentId?: number;
}

export default function ProfessionalStudentProfile({ studentId }: StudentProfileProps) {
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudentData();
    }, [studentId]);

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            // Fetch student data - replace with actual supabase call
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('id', studentId || 1)
                .single();

            const studentData = {
                ...data,
                admission_number: data?.school_generated_id || 'SCH-STU-PENDING'
            };

            setStudent(studentData || {
                first_name: 'Student',
                last_name: 'Name',
                email: 'student@school.com',
                phone: '+234 XXX XXX XXXX',
                class_name: 'Grade 10A',
                admission_number: 'STU2024001',
                date_of_birth: '2008-01-15',
                address: 'Lagos, Nigeria',
                guardian_name: 'Parent Name',
                guardian_phone: '+234 XXX XXX XXXX',
                attendance_rate: 95,
                average_grade: 88,
            });
        } catch (error) {
            console.error('Error fetching student:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header with gradient background */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 pb-32 pt-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="flex items-center text-white/80 text-sm mb-8">
                        <span className="hover:text-white cursor-pointer">Dashboard</span>
                        <span className="mx-2">/</span>
                        <span className="text-white font-medium">My Profile</span>
                    </div>

                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white p-2 shadow-2xl">
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-4xl md:text-5xl font-bold">
                                    {student.first_name?.[0]}{student.last_name?.[0]}
                                </div>
                            </div>
                            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                                {student.first_name} {student.last_name}
                            </h1>
                            <p className="text-white/90 text-lg mb-4">{student.class_name}</p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                                    School ID: {student.admission_number || 'Pending Generation'}
                                </span>
                                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Joined 2024
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white transition-all">
                                <Download className="w-5 h-5" />
                            </button>
                            <button className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:shadow-xl transition-all">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 pb-12">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<TrendingUp className="w-6 h-6" />}
                        label="Attendance"
                        value={`${student.attendance_rate}%`}
                        color="bg-emerald-500"
                        trend="+5%"
                    />
                    <StatCard
                        icon={<Award className="w-6 h-6" />}
                        label="Average Grade"
                        value={`${student.average_grade}%`}
                        color="bg-blue-500"
                        trend="+3%"
                    />
                    <StatCard
                        icon={<BookOpen className="w-6 h-6" />}
                        label="Courses"
                        value="12"
                        color="bg-purple-500"
                    />
                    <StatCard
                        icon={<FileText className="w-6 h-6" />}
                        label="Assignments"
                        value="45"
                        color="bg-pink-500"
                        badge="3 pending"
                    />
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Personal Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Personal Information */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <User className="w-5 h-5 text-indigo-600" />
                                </div>
                                Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoField icon={<Mail />} label="Email" value={student.email} />
                                <InfoField icon={<Phone />} label="Phone" value={student.phone} />
                                <InfoField icon={<Calendar />} label="Date of Birth" value={new Date(student.date_of_birth).toLocaleDateString()} />
                                <InfoField icon={<MapPin />} label="Address" value={student.address} />
                            </div>
                        </div>

                        {/* Guardian Information */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Users className="w-5 h-5 text-purple-600" />
                                </div>
                                Guardian Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoField icon={<User />} label="Guardian Name" value={student.guardian_name} />
                                <InfoField icon={<Phone />} label="Guardian Phone" value={student.guardian_phone} />
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
                            <div className="space-y-4">
                                <ActivityItem
                                    title="Mathematics Quiz Completed"
                                    description="Scored 92% in Algebra quiz"
                                    time="2 hours ago"
                                    icon="📊"
                                />
                                <ActivityItem
                                    title="Assignment Submitted"
                                    description="English essay on Shakespeare"
                                    time="1 day ago"
                                    icon="📝"
                                />
                                <ActivityItem
                                    title="Attendance Marked"
                                    description="Present in all classes today"
                                    time="2 days ago"
                                    icon="✅"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Links & Performance */}
                    <div className="space-y-6">
                        {/* Quick Links */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <QuickLinkButton label="View Timetable" icon="📅" />
                                <QuickLinkButton label="My Results" icon="📈" />
                                <QuickLinkButton label="Assignments" icon="📚" />
                                <QuickLinkButton label="Fees & Payments" icon="💳" />
                                <QuickLinkButton label="Library" icon="📖" />
                            </div>
                        </div>

                        {/* Performance Chart */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Overview</h3>
                            <div className="space-y-4">
                                <PerformanceBar subject="Mathematics" percentage={92} color="bg-blue-500" />
                                <PerformanceBar subject="English" percentage={88} color="bg-green-500" />
                                <PerformanceBar subject="Science" percentage={85} color="bg-purple-500" />
                                <PerformanceBar subject="History" percentage={90} color="bg-pink-500" />
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-sm p-6 text-white">
                            <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
                            <div className="space-y-3">
                                <EventItem date="Jan 15" title="Mid-term Exams" />
                                <EventItem date="Jan 20" title="Sports Day" />
                                <EventItem date="Jan 25" title="Parent-Teacher Meeting" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color, trend, badge }: any) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${color} rounded-xl text-white`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-emerald-600 text-sm font-semibold">{trend}</span>
                )}
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {badge && (
                <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                    {badge}
                </span>
            )}
        </div>
    );
}

// Info Field Component
function InfoField({ icon, label, value }: any) {
    return (
        <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600 mt-1">
                {React.cloneElement(icon, { className: 'w-4 h-4' })}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                <p className="text-base font-semibold text-gray-900 truncate">{value}</p>
            </div>
        </div>
    );
}

// Activity Item
function ActivityItem({ title, description, time, icon }: any) {
    return (
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-600">{description}</p>
                <p className="text-xs text-gray-400 mt-1">{time}</p>
            </div>
        </div>
    );
}

// Quick Link Button
function QuickLinkButton({ label, icon }: any) {
    return (
        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
            <span className="text-xl">{icon}</span>
            <span className="font-medium text-gray-700">{label}</span>
            <span className="ml-auto text-gray-400">→</span>
        </button>
    );
}

// Performance Bar
function PerformanceBar({ subject, percentage, color }: any) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{subject}</span>
                <span className="text-sm font-bold text-gray-900">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

// Event Item
function EventItem({ date, title }: any) {
    return (
        <div className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-sm rounded-lg">
            <div className="text-center">
                <p className="text-xs font-medium opacity-80">{date.split(' ')[0]}</p>
                <p className="text-lg font-bold">{date.split(' ')[1]}</p>
            </div>
            <p className="font-medium">{title}</p>
        </div>
    );
}
