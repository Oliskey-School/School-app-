import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Award, TrendingUp, BookOpen, Download, FileText, Users, LogOut, Settings, Camera, ChevronRight, Bell, Shield, Book } from 'lucide-react'; // Using Lucide icons for consistency with Professional profile
import { supabase } from '../../lib/supabase';
import { Student } from '../../types';
import { useProfile } from '../../context/ProfileContext';
import { ExamIcon, LogoutIcon } from '../../constants'; // Keep custom icons where needed

interface StudentProfileScreenProps {
    studentId: number;
    student: Student;
    onLogout: () => void;
    navigateTo: (view: string, title: string, props?: any) => void;
}

export default function StudentProfileStandard({ studentId, student: initialStudent, onLogout, navigateTo }: StudentProfileScreenProps) {
    const [student, setStudent] = useState<any>(initialStudent || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!initialStudent && studentId) {
            fetchStudentData();
        } else if (initialStudent) {
            // Ensure defaults
            setStudent({
                ...initialStudent,
                attendance_rate: initialStudent.attendance || 95,
                average_grade: initialStudent.performance || 88,
                class_name: `Grade ${initialStudent.grade}${initialStudent.section}`,
                admission_number: initialStudent.schoolGeneratedId || 'Pending Generation'
            });
        }
    }, [studentId, initialStudent]);

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('id', studentId)
                .single();

            if (data) {
                setStudent({
                    ...data,
                    name: data.name,
                    email: data.email,
                    phone: data.parent_phone || 'N/A', // Assuming parent phone as contact for student profile
                    class_name: `Grade ${data.grade}${data.section}`,
                    admission_number: data.school_generated_id,
                    date_of_birth: data.birthday,
                    address: data.address || 'School Address',
                    guardian_name: data.parent_name || 'Parent',
                    guardian_phone: data.parent_phone || 'N/A',
                    attendance_rate: data.attendance_status === 'Present' ? 98 : 95, // Mock if not tracked
                    average_grade: 88, // Mock
                });
            }
        } catch (error) {
            console.error('Error fetching student:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !student) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!student) return null;

    // Safer defaults
    const displayAvatar = student.avatarUrl || student.avatar_url || 'https://i.pravatar.cc/150?u=student';
    const displayName = student.name || `${student.first_name || ''} ${student.last_name || ''}`;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header with Orange gradient background */}
            <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 pb-32 pt-8 px-4 sm:px-6 lg:px-8 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="flex items-center text-white/90 text-sm mb-8">
                        <span className="hover:text-white cursor-pointer opacity-80">Dashboard</span>
                        <span className="mx-2 opacity-60">/</span>
                        <span className="text-white font-bold">My Profile</span>
                    </div>

                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white p-1.5 shadow-2xl transition-transform hover:scale-105">
                                <img
                                    src={displayAvatar}
                                    className="w-full h-full rounded-full object-cover border-4 border-orange-100"
                                    alt="Profile"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://i.pravatar.cc/150?u=fallback'; }}
                                />
                            </div>
                            <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
                                <span className="sr-only">Online</span>
                            </div>
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 text-center md:text-left text-white">
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 shadow-sm text-shadow">
                                {displayName}
                            </h1>
                            <p className="text-gray-500 font-mono text-sm mt-1">{student.schoolGeneratedId || "ID NOT SET"}</p>
                            <p className="text-white/90 text-lg mb-4 font-medium opacity-90">{student.class_name || 'Grade 10'}</p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-semibold border border-white/20">
                                    ID: {student.admission_number || 'Pending Generation'}
                                </span>
                                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-semibold border border-white/20 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Active Student
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button onClick={() => navigateTo('editProfile', 'Edit Profile')} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/40 text-white rounded-xl font-semibold transition-all">
                                Edit Profile
                            </button>
                            <button onClick={onLogout} className="px-4 py-2.5 bg-white text-orange-600 rounded-xl font-bold shadow-lg hover:bg-orange-50 transition-all flex items-center gap-2">
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 pb-12 relative z-10">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<TrendingUp className="w-6 h-6" />}
                        label="Attendance"
                        value={`${student.attendance_rate || 95}%`}
                        color="bg-emerald-500"
                        trend="+2%"
                    />
                    <StatCard
                        icon={<Award className="w-6 h-6" />}
                        label="Avg. Grade"
                        value={`${student.average_grade || 88}%`}
                        color="bg-orange-500" // Orange for student theme
                        trend="+5%"
                    />
                    <StatCard
                        icon={<BookOpen className="w-6 h-6" />}
                        label="Subjects"
                        value="12"
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={<FileText className="w-6 h-6" />}
                        label="Assignments"
                        value="45"
                        color="bg-amber-500" // Amber
                        badge="2 pending"
                    />
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Personal Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Personal Information */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <User className="w-5 h-5 text-orange-600" />
                                </div>
                                Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoField icon={<Mail />} label="Email" value={student.email} />
                                <InfoField icon={<Phone />} label="Phone" value={student.phone || student.contact_phone || 'N/A'} />
                                <InfoField icon={<Calendar />} label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'} />
                                <InfoField icon={<MapPin />} label="Address" value={student.address || 'N/A'} />
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h2>
                            <div className="space-y-4">
                                <ActivityItem
                                    title="Mathematics Quiz"
                                    description="Scored 92% in Algebra"
                                    time="2 hours ago"
                                    icon="📊"
                                    bg="bg-blue-50"
                                />
                                <ActivityItem
                                    title="Assignment Submitted"
                                    description="English Essay"
                                    time="1 day ago"
                                    icon="📝"
                                    bg="bg-orange-50"
                                />
                                <ActivityItem
                                    title="Attendance Marked"
                                    description="Present today"
                                    time="Today"
                                    icon="✅"
                                    bg="bg-green-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Quick Links & Performance */}
                    <div className="space-y-6">
                        {/* Quick Links */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <QuickLinkButton
                                    label="CBT & Examinations"
                                    icon={<ExamIcon className="w-5 h-5 text-orange-600" />}
                                    onClick={() => navigateTo('quizzes', 'CBT & Examinations')}
                                    active
                                />
                                <QuickLinkButton
                                    label="View Timetable"
                                    icon={<Calendar className="w-5 h-5 text-gray-600" />}
                                    onClick={() => navigateTo('timetable', 'Timetable')}
                                />
                                <QuickLinkButton
                                    label="My Results"
                                    icon={<TrendingUp className="w-5 h-5 text-gray-600" />}
                                    onClick={() => navigateTo('results', 'Results')}
                                />
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-md p-6 text-white">
                            <div className="flex items-center gap-2 mb-4">
                                <Bell className="w-5 h-5" />
                                <h3 className="text-lg font-bold">Upcoming</h3>
                            </div>
                            <div className="space-y-3">
                                <EventItem date="Jan 15" title="Mid-term Exams" />
                                <EventItem date="Jan 20" title="Sports Day" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-components

function StatCard({ icon, label, value, color, trend, badge }: any) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-3 ${color} rounded-xl text-white shadow-sm`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
                )}
            </div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1 opacity-80">{label}</p>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            {badge && (
                <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">
                    {badge}
                </span>
            )}
        </div>
    );
}

function InfoField({ icon, label, value }: any) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="p-2 bg-white border border-gray-100 shadow-sm rounded-lg text-gray-400 mt-0.5">
                {React.cloneElement(icon, { className: 'w-4 h-4' })}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
            </div>
        </div>
    );
}

function ActivityItem({ title, description, time, icon, bg }: any) {
    return (
        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
            <div className={`w-10 h-10 rounded-full ${bg || 'bg-gray-100'} flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{title}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
            <p className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{time}</p>
        </div>
    );
}

function QuickLinkButton({ label, icon, onClick, active }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left border ${active ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-100'}`}
        >
            <div className={`${active ? 'bg-white shadow-sm p-1.5 rounded-lg' : ''}`}>
                {icon}
            </div>
            <span className={`font-semibold text-sm ${active ? 'text-orange-700' : 'text-gray-600'}`}>{label}</span>
            <ChevronRight className={`ml-auto w-4 h-4 ${active ? 'text-orange-400' : 'text-gray-300'}`} />
        </button>
    );
}

function EventItem({ date, title }: any) {
    return (
        <div className="flex items-center gap-3 p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-colors cursor-pointer border border-white/10">
            <div className="text-center bg-white/20 rounded-lg px-2 py-1 min-w-[50px]">
                <p className="text-[10px] font-bold opacity-80 uppercase">{date.split(' ')[0]}</p>
                <p className="text-sm font-black">{date.split(' ')[1]}</p>
            </div>
            <p className="font-semibold text-sm">{title}</p>
        </div>
    );
}
