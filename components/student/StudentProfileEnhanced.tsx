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
    Clock, Target, Briefcase, Globe
} from 'lucide-react';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';

// ... (existing imports)

interface StudentProfileEnhancedProps {
    studentId?: number;
}

export default function StudentProfileEnhanced({ studentId }: StudentProfileEnhancedProps) {
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // AI Focus State
    const [learningFocus, setLearningFocus] = useState<any>(null);
    const [focusLoading, setFocusLoading] = useState(false);

    useEffect(() => {
        fetchStudentData();
    }, [studentId]);

    const generateLearningFocus = async (studentData: any) => {
        setFocusLoading(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
            const ai = getAIClient(apiKey);

            const prompt = `Analyze this student's performance and suggest 2 key learning focus areas for today.
            Student: ${studentData.first_name}
            Grade: ${studentData.class_name}
            Performance: Average ${studentData.average_grade}%
            
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
        } catch (e) {
            console.error("AI Focus Error:", e);
        } finally {
            setFocusLoading(false);
        }
    };

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('id', studentId || 1)
                .single();

            const sData = data || {
                first_name: 'Alex',
                last_name: 'Johnson',
                email: 'alex.johnson@school.com',
                phone: '+234 803 XXX XXXX',
                class_name: 'Grade 10A',
                admission_number: 'STU2024001',
                date_of_birth: '2008-05-15',
                address: 'Victoria Island, Lagos',
                guardian_name: 'Jennifer Johnson',
                guardian_phone: '+234 803 XXX XXXX',
                attendance_rate: 95,
                average_grade: 88,
                profile_photo: null,
            };
            setStudent(sData);

            // Trigger AI after data load
            generateLearningFocus(sData);

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
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
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 opacity-90"></div>
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
                                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-300"></div>
                                    <div className="relative w-32 h-32 lg:w-40 lg:h-40 bg-white rounded-full p-1.5 shadow-2xl">
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                            <span className="text-4xl lg:text-5xl font-bold tracking-tight">
                                                {student.first_name?.[0]}{student.last_name?.[0]}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-lg"></div>
                                    <button className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit className="w-4 h-4 text-slate-700" />
                                    </button>
                                </div>

                                {/* Name & Title */}
                                <div className="text-center sm:text-left">
                                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
                                        {student.first_name} {student.last_name}
                                    </h1>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-4">
                                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            {student.class_name}
                                        </Badge>
                                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm">
                                            ID: {student.admission_number}
                                        </Badge>
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
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        icon={<TrendingUp className="w-5 h-5" />}
                                        label="Attendance"
                                        value={`${student.attendance_rate}%`}
                                        trend="+2.5%"
                                        trendUp={true}
                                    />
                                    <StatCard
                                        icon={<Award className="w-5 h-5" />}
                                        label="Average"
                                        value={`${student.average_grade}%`}
                                        trend="+4.2%"
                                        trendUp={true}
                                    />
                                    <StatCard
                                        icon={<BookOpen className="w-5 h-5" />}
                                        label="Subjects"
                                        value="12"
                                        badge="Active"
                                    />
                                    <StatCard
                                        icon={<Target className="w-5 h-5" />}
                                        label="Rank"
                                        value="#3"
                                        badge="Top 5%"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 mt-6">
                                    <Button className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg font-semibold">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Transcript
                                    </Button>
                                    <Button className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm">
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share Profile
                                    </Button>
                                    <Button className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm">
                                        <Settings className="w-4 h-4" />
                                    </Button>
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
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-4 pt-4 font-semibold"
                                >
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger
                                    value="academic"
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-4 pt-4 font-semibold"
                                >
                                    Academic
                                </TabsTrigger>
                                <TabsTrigger
                                    value="activities"
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-4 pt-4 font-semibold"
                                >
                                    Activities
                                </TabsTrigger>
                                <TabsTrigger
                                    value="documents"
                                    className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-4 pt-4 font-semibold"
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
                                                <div className="p-2 bg-indigo-100 rounded-lg">
                                                    <User className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                Personal Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <InfoField icon={<Mail />} label="Email Address" value={student.email} />
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
                                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-1 shadow-lg mb-6 transform hover:scale-[1.01] transition-transform">
                                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 bg-white/20 rounded-lg text-white animate-pulse">
                                                        <Target className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-white mb-1">🎯 Today's Learning Focus</h3>
                                                        <p className="text-indigo-100 text-sm mb-3">Based on your recent performance, we recommend focusing on:</p>
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
                                                <PerformanceBar subject="Mathematics" score={92} grade="A" color="blue" />
                                                <PerformanceBar subject="English Language" score={88} grade="B+" color="green" />
                                                <PerformanceBar subject="Physics" score={85} grade="B" color="purple" />
                                                <PerformanceBar subject="Chemistry" score={90} grade="A-" color="pink" />
                                                <PerformanceBar subject="Biology" score={87} grade="B+" color="indigo" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column - 1/3 */}
                                <div className="space-y-6">
                                    {/* Quick Stats */}
                                    <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Week Overview</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <QuickStat icon={<CheckCircle />} label="Classes Attended" value="28/30" color="emerald" />
                                            <QuickStat icon={<FileText />} label="Assignments" value="12/15" color="blue" />
                                            <QuickStat icon={<Clock />} label="Study Hours" value="24h" color="purple" />
                                            <QuickStat icon={<Award />} label="Achievements" value="3" color="amber" />
                                        </CardContent>
                                    </Card>

                                    {/* Upcoming Events */}
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="border-b border-slate-100">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Bell className="w-5 h-5 text-indigo-600" />
                                                Upcoming
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <EventItem date="Jan 15" title="Mathematics Test" time="9:00 AM" />
                                            <EventItem date="Jan 18" title="Science Fair" time="2:00 PM" />
                                            <EventItem date="Jan 22" title="Sports Day" time="All Day" />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Other tabs */}
                        <TabsContent value="academic" className="p-6 lg:p-8">
                            <div className="text-center py-12">
                                <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">Academic records will appear here</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="activities" className="p-6 lg:p-8">
                            <div className="text-center py-12">
                                <Briefcase className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">Extracurricular activities will appear here</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="documents" className="p-6 lg:p-8">
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500">Documents will appear here</p>
                            </div>
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
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-indigo-50 rounded-xl flex-shrink-0">
                <span className="text-xs font-semibold text-indigo-600 uppercase">{date.split(' ')[0]}</span>
                <span className="text-xl font-bold text-indigo-600">{date.split(' ')[1]}</span>
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
