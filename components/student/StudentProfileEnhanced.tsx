import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../lib/supabase';
import {
    User, BookOpen, FileText, Calendar,
    Download, Eye, GraduationCap, CheckCircle,
    Award, TrendingUp, Mail, Phone, MapPin,
    Edit, Share2, Settings, Bell, ChevronRight,
    Clock, Target, Briefcase, Globe, Copy
} from 'lucide-react';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';
import { fetchAcademicPerformance, fetchStudentStats, fetchUpcomingEvents } from '../../lib/database';
import { useUserIdentity } from '../../lib/hooks/useUserIdentity';

// ... (existing imports)

import { toast } from 'react-hot-toast';

// ... (existing imports)

interface StudentProfileEnhancedProps {
    studentId?: number;
    student?: any; // Accept passed down student object to avoid re-fetching if possible
    navigateTo?: (view: string, title: string, props?: any) => void;
}

export default function StudentProfileEnhanced({ studentId, student: initialStudent, navigateTo }: StudentProfileEnhancedProps) {
    const { customId, formatId, copyToClipboard, copied } = useUserIdentity();
    const [student, setStudent] = useState<any>(initialStudent || null);
    const [loading, setLoading] = useState(!initialStudent);
    const [activeTab, setActiveTab] = useState('overview');

    // Real Data State
    const [performance, setPerformance] = useState<any[]>([]);
    const [stats, setStats] = useState({ attendanceRate: 0, assignmentsSubmitted: 0, averageScore: 0, studyHours: 0, achievements: 0 });
    const [events, setEvents] = useState<any[]>([]);

    // AI Focus State
    const [learningFocus, setLearningFocus] = useState<any>(null);
    const [focusLoading, setFocusLoading] = useState(false);

    useEffect(() => {
        if (studentId || initialStudent?.id) {
            fetchProfileData(studentId || initialStudent.id);
        }
    }, [studentId, initialStudent]);

    const fetchProfileData = async (id: number) => {
        try {
            // 1. Fetch Basic Student Info (if not provided)
            let currentStudent = initialStudent;
            if (!currentStudent) {
                setLoading(true);
                const { data } = await supabase.from('students').select('*').eq('id', id).single();
                if (data) {
                    currentStudent = {
                        ...data,
                        first_name: data.name.split(' ')[0],
                        last_name: data.name.split(' ').slice(1).join(' '),
                        class_name: `Grade ${data.grade}${data.section}`,
                        admission_number: data.school_generated_id || `STU${data.id}`,
                        date_of_birth: data.birthday || '2000-01-01',
                        phone: data.phone || 'N/A',
                        address: data.address || 'N/A',
                        email: data.email,
                        guardian_name: data.parent_name || 'Guardian',
                        guardian_phone: data.parent_phone || 'N/A',
                        average_grade: 0 // Will be updated by stats
                    };
                    setStudent(currentStudent);
                }
            } else if (!student) {
                // Ensure we format the initialStudent if it came from dashboard props raw
                setStudent({
                    ...initialStudent,
                    first_name: initialStudent.name.split(' ')[0],
                    last_name: initialStudent.name.split(' ').slice(1).join(' '),
                    class_name: `Grade ${initialStudent.grade}${initialStudent.section}`,
                    admission_number: initialStudent.schoolId || `STU${initialStudent.id}`,
                });
            }

            if (!currentStudent) return; // Should handle not found

            // 2. Fetch Related Data in Parallel
            const [perfData, statsData, eventsData] = await Promise.all([
                fetchAcademicPerformance(id),
                fetchStudentStats(id),
                fetchUpcomingEvents(currentStudent.grade, currentStudent.section, id)
            ]);

            setPerformance(perfData);
            setStats(statsData);
            setEvents(eventsData);

            // Update student object with real stats
            setStudent(prev => ({ ...prev, average_grade: statsData.averageScore, attendance_rate: statsData.attendanceRate }));

            // 3. Trigger AI Analysis
            generateLearningFocus(currentStudent, statsData.averageScore);

        } catch (error) {
            console.error('Error fetching profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateLearningFocus = async (studentData: any, averageScore: number) => {
        setFocusLoading(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
            const ai = getAIClient(apiKey);

            const prompt = `Analyze this student's performance and suggest 2 key learning focus areas for today.
            Student: ${studentData.first_name}
            Grade: ${studentData.class_name || '10'}
            Performance: Average ${averageScore}%
            
            Return JSON with:
            - title (string) e.g. "Quadratic Equations"
            - subject (string) e.g. "Math"
            - reason (string) e.g. "Score: 65%" or "Upcoming Test"
            - color (string) one of: pink, teal, violet, orange
            
            Limit to 2 items.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            focus_areas: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        subject: { type: Type.STRING },
                                        reason: { type: Type.STRING },
                                        color: { type: Type.STRING }
                                    },
                                    required: ["title", "subject", "reason", "color"]
                                }
                            }
                        }
                    }
                }
            });

            const data = JSON.parse(response.text);
            if (data.focus_areas) {
                setLearningFocus(data.focus_areas);
            }
        } catch (e: any) {
            // Suppress API key errors or JSON parse errors to avoid console noise for the user
            if (e?.message?.includes('API key') || e instanceof SyntaxError) {
                console.log("AI Focus unavailable (API Key/Network)");
            } else {
                console.error("AI Focus Error:", e);
            }
        } finally {
            setFocusLoading(false);
        }
    };

    // ... Helper functions for colors ...
    const getGradeColor = (score: number) => {
        if (score >= 90) return 'blue';
        if (score >= 80) return 'green';
        if (score >= 70) return 'purple';
        if (score >= 60) return 'pink';
        return 'indigo';
    };

    const getGradeLetter = (score: number) => {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 75) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    };

    if (loading || !student) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Premium Header Section */}
            <div className="relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 opacity-90"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

                <div className="relative px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                    <div className="max-w-7xl mx-auto">
                        {/* Navigation Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-white/80 mb-8">
                            <span className="hover:text-white cursor-pointer transition-colors">Dashboard</span>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-white font-semibold">Student Profile</span>
                        </div>

                        {/* Profile Header */}
                        <div className="flex flex-col lg:flex-row items-start gap-8">
                            {/* Avatar & Name Section */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-shrink-0">
                                {/* Avatar with Status */}
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-300"></div>
                                    <div className="relative w-32 h-32 lg:w-40 lg:h-40 bg-white rounded-full p-1.5 shadow-2xl">
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white overflow-hidden">
                                            {student.avatarUrl || student.profile_photo ? (
                                                <img src={student.avatarUrl || student.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-4xl lg:text-5xl font-bold tracking-tight">
                                                    {student.first_name?.[0]}{student.last_name?.[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-lg"></div>
                                </div>

                                {/* Name & Title */}
                                <div className="text-center sm:text-left">
                                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
                                        {student.first_name} {student.last_name}
                                    </h1>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-4">
                                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            {student.class_name || `Grade ${student.grade}`}
                                        </Badge>
                                        <div
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => copyToClipboard(customId)}
                                        >
                                            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm flex items-center gap-2">
                                                ID: {student.admission_number || student.school_generated_id || formatId(customId) || student.schoolId || 'Pending'}
                                                <Copy className="w-3 h-3 opacity-70" />
                                                {copied && <span className="text-xs ml-1">Copied!</span>}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-sm text-white/90">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-4 h-4" />
                                            <span>{student.email}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Cards - Horizontal on Desktop */}
                            <div className="flex-1 w-full">
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                    <StatCard
                                        icon={<TrendingUp className="w-5 h-5" />}
                                        label="Attendance"
                                        value={`${stats.attendanceRate}%`}
                                        trend={stats.attendanceRate > 90 ? "+ Good" : "Needs Imp."}
                                        trendUp={stats.attendanceRate > 90}
                                    />
                                    <StatCard
                                        icon={<Award className="w-5 h-5" />}
                                        label="Average"
                                        value={`${stats.averageScore}%`}
                                        trend={stats.averageScore > 75 ? "+ Good" : "Fair"}
                                        trendUp={stats.averageScore > 75}
                                    />
                                    <StatCard
                                        icon={<BookOpen className="w-5 h-5" />}
                                        label="Performance"
                                        value={performance.length.toString()}
                                        badge="Subjects"
                                    />
                                    <StatCard
                                        icon={<Target className="w-5 h-5" />}
                                        label="Submitted"
                                        value={stats.assignmentsSubmitted.toString()}
                                        badge="Assign."
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
                                    <Button onClick={() => window.print()} className="w-full sm:w-auto bg-white text-orange-600 hover:bg-white/90 shadow-lg font-semibold order-2 sm:order-1">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Transcript
                                    </Button>
                                    <Button onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        toast.success('Profile link copied to clipboard!');
                                    }} className="w-full sm:w-auto bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm order-1 sm:order-2">
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share Profile
                                    </Button>
                                    {navigateTo && (
                                        <Button onClick={() => navigateTo('editProfile', 'Edit Profile')} className="w-full sm:w-auto bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm order-3">
                                            <Settings className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Premium Tabs */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
                    <Tabs defaultValue="overview" className="w-full">
                        <div className="border-b border-slate-200 bg-slate-50/50 px-6">
                            <TabsList className="bg-transparent h-auto p-0 gap-6">
                                <TabsTrigger
                                    value="overview"
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none px-0 pb-4 pt-4 font-semibold"
                                >
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger
                                    value="academic"
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none px-0 pb-4 pt-4 font-semibold"
                                >
                                    Academic
                                </TabsTrigger>
                                <TabsTrigger
                                    value="activities"
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none px-0 pb-4 pt-4 font-semibold"
                                >
                                    Activities
                                </TabsTrigger>
                                <TabsTrigger
                                    value="documents"
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none px-0 pb-4 pt-4 font-semibold"
                                >
                                    Documents
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="p-6 lg:p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column -2/3 */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Personal Information */}
                                    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                            <CardTitle className="flex items-center gap-3 text-lg">
                                                <div className="p-2 bg-orange-100 rounded-lg">
                                                    <User className="w-5 h-5 text-orange-600" />
                                                </div>
                                                Personal Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <InfoField icon={<Mail />} label="Email Address" value={student.email || 'N/A'} />
                                                <InfoField icon={<Phone />} label="Phone Number" value={student.phone} />
                                                <InfoField icon={<Calendar />} label="Date of Birth" value={new Date(student.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                                                <InfoField icon={<MapPin />} label="Address" value={student.address} />
                                                <InfoField icon={<User />} label="Guardian" value={student.guardian_name} />
                                                <InfoField icon={<Phone />} label="Guardian Contact" value={student.guardian_phone} />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* AI Personal Focus */}
                                    {learningFocus && (
                                        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl p-1 shadow-lg mb-6 transform hover:scale-[1.01] transition-transform">
                                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 bg-white/20 rounded-lg text-white animate-pulse">
                                                        <Target className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-white mb-1">🎯 Today's Learning Focus</h3>
                                                        <p className="text-orange-100 text-sm mb-3">Based on your recent performance, we recommend focusing on:</p>
                                                        <div className="space-y-2">
                                                            {learningFocus.map((item: any, idx: number) => {
                                                                const colors: any = {
                                                                    pink: 'bg-pink-400',
                                                                    teal: 'bg-teal-400',
                                                                    violet: 'bg-violet-400',
                                                                    orange: 'bg-orange-400'
                                                                };
                                                                return (
                                                                    <div key={idx} className="flex items-center gap-2 text-white/90 bg-white/10 p-2 rounded px-3 border border-white/10">
                                                                        <div className={`w-2 h-2 rounded-full ${colors[item.color] || 'bg-white'}`}></div>
                                                                        <span className="text-sm font-medium">{item.title} ({item.subject})</span>
                                                                        <span className="text-xs ml-auto opacity-75">{item.reason}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Academic Performance */}
                                    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                            <CardTitle className="flex items-center gap-3 text-lg">
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                                </div>
                                                Performance Overview
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="space-y-5">
                                                {performance.length > 0 ? performance.map((p, i) => (
                                                    <PerformanceBar
                                                        key={i}
                                                        subject={p.subject}
                                                        score={p.score}
                                                        grade={getGradeLetter(p.score)}
                                                        color={getGradeColor(p.score)}
                                                    />
                                                )) : (
                                                    <div className="text-center py-4 text-slate-500">No performance records found yet.</div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column - 1/3 */}
                                <div className="space-y-6">
                                    {/* Quick Stats */}
                                    <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-orange-50 to-red-50">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Stats</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <QuickStat icon={<CheckCircle />} label="Classes Attended" value={`${stats.attendanceRate}%`} color="emerald" />
                                            <QuickStat icon={<FileText />} label="Assignments Submitted" value={stats.assignmentsSubmitted} color="blue" />
                                            <QuickStat icon={<Clock />} label="Est. Study Hours" value={`${stats.studyHours}h`} color="purple" />
                                            <QuickStat icon={<Award />} label="Achievements" value={stats.achievements} color="amber" />
                                        </CardContent>
                                    </Card>

                                    {/* Upcoming Events */}
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="border-b border-slate-100">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Bell className="w-5 h-5 text-orange-600" />
                                                Upcoming
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {events.length > 0 ? events.map((event, i) => (
                                                <EventItem
                                                    key={i}
                                                    date={new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                    title={event.title}
                                                    time={event.type === 'Assignment' ? 'Due Date' : new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                />
                                            )) : (
                                                <div className="p-4 text-center text-slate-500 text-sm">No upcoming events.</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Other tabs */}
                        <TabsContent value="academic" className="p-6 lg:p-8">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="border-b border-slate-100">
                                    <CardTitle>Academic Records</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4">Subject</th>
                                                    <th className="px-6 py-4">Assessment</th>
                                                    <th className="px-6 py-4">Score</th>
                                                    <th className="px-6 py-4">Grade</th>
                                                    <th className="px-6 py-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {performance.length > 0 ? performance.map((p, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-slate-900">{p.subject}</td>
                                                        <td className="px-6 py-4 text-slate-500">End of Term</td>
                                                        <td className="px-6 py-4 font-semibold">{p.score}%</td>
                                                        <td className="px-6 py-4">
                                                            <Badge className={`${getGradeColor(p.score).replace('bg-', 'bg-').replace('text-', 'text-')}-100 text-${getGradeColor(p.score).replace('bg-', '')}-700 border-0`}>
                                                                {getGradeLetter(p.score)}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 text-emerald-600 font-medium">Completed</td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No academic records available.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="activities" className="p-6 lg:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { name: "Debate Club", role: "President", schedule: "Fridays, 3 PM", status: "Active", color: "orange" },
                                    { name: "Science Fair", role: "Participant", schedule: "Annual", status: "Upcoming", color: "blue" },
                                    { name: "Football Team", role: "Forward", schedule: "Tue & Thu, 4 PM", status: "Active", color: "emerald" }
                                ].map((activity, i) => (
                                    <div key={i} className="bg-white border boundary-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                        <div className={`w-12 h-12 rounded-lg bg-${activity.color}-100 text-${activity.color}-600 flex items-center justify-center mb-4`}>
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">{activity.name}</h3>
                                        <p className="text-sm text-slate-500 mb-4">{activity.role}</p>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4">
                                            <Clock className="w-3 h-3" />
                                            {activity.schedule}
                                        </div>
                                        <Badge className={`bg-${activity.color}-50 text-${activity.color}-700 border-${activity.color}-200`}>
                                            {activity.status}
                                        </Badge>
                                    </div>
                                ))}
                                {/* Add New Activity Button */}
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50/50 transition-all cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-orange-100">
                                        <span className="text-2xl font-light">+</span>
                                    </div>
                                    <span className="font-medium">Join New Activity</span>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="documents" className="p-6 lg:p-8">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="border-b border-slate-100">
                                    <CardTitle>Student Documents</CardTitle>
                                </CardHeader>
                                <CardContent className="divide-y divide-slate-100">
                                    {[
                                        { name: "Term 1 Report Card", type: "PDF", date: "Dec 15, 2025", size: "2.4 MB" },
                                        { name: "Medical Record Form", type: "PDF", date: "Sep 10, 2025", size: "1.1 MB" },
                                        { name: "Student Handbook", type: "PDF", date: "Sep 01, 2025", size: "4.5 MB" }
                                    ].map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{doc.name}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                                        <span>{doc.date}</span>
                                                        <span>•</span>
                                                        <span>{doc.size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => toast.success(`Downloading ${doc.name}...`)}>
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, trend, trendUp, badge }: any) {
    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg text-white">
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs font-semibold ${trendUp ? 'text-emerald-300' : 'text-red-300'}`}>
                        {trend}
                    </span>
                )}
                {badge && (
                    <Badge className="bg-white/20 text-white text-xs border-0">
                        {badge}
                    </Badge>
                )}
            </div>
            <div className="text-white/70 text-xs font-medium mb-1">{label}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
        </div>
    );
}

// Info Field Component
function InfoField({ icon, label, value }: any) {
    return (
        <div className="group">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{label}</label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
                <div className="text-slate-400">
                    {React.cloneElement(icon, { className: 'w-4 h-4' })}
                </div>
                <span className="text-slate-900 font-medium">{value}</span>
            </div>
        </div>
    );
}

// Performance Bar
function PerformanceBar({ subject, score, grade, color }: any) {
    const colorMap: any = {
        blue: { bg: 'bg-blue-500', light: 'bg-blue-100' },
        green: { bg: 'bg-emerald-500', light: 'bg-emerald-100' },
        purple: { bg: 'bg-purple-500', light: 'bg-purple-100' },
        pink: { bg: 'bg-pink-500', light: 'bg-pink-100' },
        indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-100' },
    };

    return (
        <div className="group">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">{subject}</span>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">{score}%</span>
                    <Badge className={`${colorMap[color].light} text-${color}-700 border-0 text-xs`}>
                        {grade}
                    </Badge>
                </div>
            </div>
            <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`absolute left-0 top-0 h-full ${colorMap[color].bg} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>
        </div>
    );
}

// Quick Stat
function QuickStat({ icon, label, value, color }: any) {
    const colorMap: any = {
        emerald: 'text-emerald-600 bg-emerald-100',
        blue: 'text-blue-600 bg-blue-100',
        purple: 'text-purple-600 bg-purple-100',
        amber: 'text-amber-600 bg-amber-100',
    };

    return (
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${colorMap[color]}`}>
                {React.cloneElement(icon, { className: 'w-5 h-5' })}
            </div>
            <div className="flex-1">
                <div className="text-xs text-slate-500 font-medium">{label}</div>
                <div className="text-lg font-bold text-slate-900">{value}</div>
            </div>
        </div>
    );
}

// Event Item
function EventItem({ date, title, time }: any) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-orange-50 rounded-xl flex-shrink-0">
                <span className="text-xs font-semibold text-orange-600 uppercase">{date.split(' ')[0]}</span>
                <span className="text-xl font-bold text-orange-600">{date.split(' ')[1]}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{title}</div>
                <div className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {time}
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
    );
}
