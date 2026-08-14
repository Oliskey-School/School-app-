import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import {
    MotionCard as Card,
    MotionCardHeader as CardHeader,
    MotionCardTitle as CardTitle,
    MotionCardContent as CardContent,
    MotionBadge as Badge,
    MotionList,
    MotionListItem,
} from '../ui/simple-ui';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { api } from '../../lib/api';
import { CANONICAL_TERMS } from '../../utils/annualReport';
import {
    User, BookOpen, FileText, Calendar,
    Download, Eye, GraduationCap, CheckCircle,
    Award, TrendingUp, Mail, Phone, MapPin,
    Edit, Share2, Settings, Bell, ChevronRight,
    Clock, Target, Briefcase, Globe, Copy, Lock
} from 'lucide-react';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';
import { fetchAcademicPerformance, fetchStudentStats, fetchUpcomingEvents, fetchStudentActivities, fetchStudentDocuments } from '../../lib/database';
import { useUserIdentity } from '../../lib/hooks/useUserIdentity';

// ... (existing imports)

import { toast } from 'react-hot-toast';

// ... (existing imports)

// Extracurricular activities don't carry a `color` field from the API — cycle
// through a fixed, fully-static palette by index instead of building Tailwind
// class names dynamically (which the compiler can't detect and would purge).
const ACTIVITY_COLOR_PALETTE = [
    { iconBg: 'bg-orange-100', iconText: 'text-orange-600', badgeBg: 'bg-orange-50', badgeText: 'text-orange-700', badgeBorder: 'border-orange-200' },
    { iconBg: 'bg-blue-100', iconText: 'text-blue-600', badgeBg: 'bg-blue-50', badgeText: 'text-blue-700', badgeBorder: 'border-blue-200' },
    { iconBg: 'bg-purple-100', iconText: 'text-purple-600', badgeBg: 'bg-purple-50', badgeText: 'text-purple-700', badgeBorder: 'border-purple-200' },
    { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200' },
    { iconBg: 'bg-pink-100', iconText: 'text-pink-600', badgeBg: 'bg-pink-50', badgeText: 'text-pink-700', badgeBorder: 'border-pink-200' },
];

interface StudentProfileEnhancedProps {
    studentId?: string | number;
    student?: any; // Accept passed down student object to avoid re-fetching if possible
    navigateTo?: (view: string, title: string, props?: any) => void;
    initialTab?: string;
}

export default function StudentProfileEnhanced({ studentId, student: initialStudent, navigateTo, initialTab }: StudentProfileEnhancedProps) {
    const { customId, formatId, copyToClipboard, copied } = useUserIdentity();
    const [student, setStudent] = useState<any>(initialStudent || null);
    const [loading, setLoading] = useState(!initialStudent);
    const [activeTab, setActiveTab] = useState('overview');

    // Real Data State
    const [performance, setPerformance] = useState<any[]>([]);
    // Subjects the admin assigned this student (authoritative for the Performance
    // Overview) and the student's report cards (published ones carry the scores).
    const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
    const [reportCards, setReportCards] = useState<any[]>([]);
    const [stats, setStats] = useState({ attendanceRate: 0, assignmentsSubmitted: 0, averageScore: 0, studyHours: 0, achievements: 0 });
    const [events, setEvents] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);

    // AI Focus State
    const [learningFocus, setLearningFocus] = useState<any>(null);
    const [focusLoading, setFocusLoading] = useState(false);

    useEffect(() => {
        if (initialStudent) {
            const normalized = {
                ...initialStudent,
                school_generated_id: initialStudent.school_generated_id || initialStudent.schoolGeneratedId || initialStudent.schoolId || initialStudent.admission_number,
                admission_number: initialStudent.admission_number || initialStudent.school_generated_id || initialStudent.schoolGeneratedId || initialStudent.schoolId,
                // Ensure grade/section are present for class display
                grade: initialStudent.grade || '',
                section: initialStudent.section || ''
            };
            setStudent(normalized);
        }
    }, [initialStudent]);

    const generateLearningFocus = useCallback(async (studentData: any, averageScore: number) => {
        setFocusLoading(true);
        try {
            const ai = getAIClient();

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
                model: AI_MODEL_NAME,
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
    }, []);

    const fetchProfileData = useCallback(async (id: string | number) => {
        try {
            setLoading(true);

            // 1. Fetch Basic Student Info if we don't have it or need fresh data
            let currentStudent = student;

            const dbStudent = await api.getStudentProfile(id.toString());

            if (dbStudent) {
                const mappedStudent = {
                    ...dbStudent,
                    name: dbStudent.name || dbStudent.full_name || `${dbStudent.firstName || dbStudent.first_name || ''} ${dbStudent.lastName || dbStudent.last_name || ''}`.trim() || student?.name || 'Student',
                    // The record stores the photo as avatar_url; the UI reads avatarUrl —
                    // map it so an uploaded/saved profile picture actually shows here.
                    avatarUrl: dbStudent.avatarUrl || dbStudent.avatar_url || dbStudent.profile_photo || student?.avatarUrl || '',
                    school_generated_id: dbStudent.schoolGeneratedId || dbStudent.school_generated_id,
                    admission_number: dbStudent.schoolGeneratedId || dbStudent.school_generated_id || dbStudent.admission_number || 'Pending',
                    grade: dbStudent.grade || dbStudent.class_name?.match(/\d+/)?.[0] || '10',
                    section: dbStudent.section || dbStudent.class_name?.match(/[A-Z]$/)?.[0] || 'A',
                    gender: dbStudent.gender || dbStudent.Gender,
                    dob: dbStudent.dob || dbStudent.birthday || dbStudent.date_of_birth || dbStudent.dateOfBirth,
                    address: dbStudent.address || dbStudent.Address || dbStudent.studentAddress,
                    parentName: dbStudent.parentName || dbStudent.parent_name || 'N/A',
                    parentPhone: dbStudent.parentPhone || dbStudent.parent_phone || 'N/A',
                    parentEmail: dbStudent.parentEmail || dbStudent.parent_email || 'N/A',
                    parentAddress: dbStudent.parentAddress || dbStudent.parent_address || 'N/A'
                };
                setStudent(mappedStudent);
                currentStudent = mappedStudent;
            }

            if (!currentStudent) return;

            // 2. Fetch Related Data in Parallel
            const [perfData, statsData, eventsData, activitiesData, docsData, subjectsData, reportCardsData] = await Promise.all([
                fetchAcademicPerformance(id),
                fetchStudentStats(id),
                fetchUpcomingEvents(currentStudent.grade, currentStudent.section, id),
                fetchStudentActivities(id),
                fetchStudentDocuments(id),
                api.getStudentSubjects(currentStudent.id).catch(() => []),
                api.getStudentReportCards(String(currentStudent.id)).catch(() => [])
            ]);

            setPerformance(perfData);
            setAssignedSubjects(
                (Array.isArray(subjectsData) ? subjectsData : [])
                    .map((s: any) => (typeof s === 'string' ? s : s?.name))
                    .filter(Boolean)
            );
            setReportCards(Array.isArray(reportCardsData) ? reportCardsData : []);
            setStats(statsData);
            setEvents(eventsData);
            setActivities(activitiesData);
            setDocuments(docsData);

            // Update student object with real stats
            setStudent(prev => ({
                ...prev,
                average_grade: statsData.averageScore,
                attendance_rate: statsData.attendanceRate
            }));

            // 3. Trigger AI Analysis
            generateLearningFocus(currentStudent, statsData.averageScore);

            } catch (error) {
            console.error('Error fetching profile data:', error);
            } finally {
            setLoading(false);
            }
            }, [generateLearningFocus]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('Uploading document...');
        try {
            const { url } = await api.uploadFileWithCategory(file, 'student_document');
            if (!url) throw new Error('Upload did not return a file URL');
            const docData = {
                name: file.name,
                url,
                type: file.type,
                size: `${(file.size / 1024).toFixed(1)} KB`
            };

            const { uploadStudentDocument } = await import('../../services/studentService');
            const success = await uploadStudentDocument(student.id, docData);
            
            if (success) {
                toast.success('Document uploaded successfully', { id: toastId });
                fetchProfileData(student.id); // Refresh documents
            }
        } catch (error: any) {
            toast.error('Upload failed: ' + error.message, { id: toastId });
        }
    };

    // Real-time synchronization
    useAutoSync(['students', 'grades', 'events', 'activities', 'documents'], () => {
        if (studentId || initialStudent?.id) {
            fetchProfileData((studentId || initialStudent.id) as any);
        }
    });

    useEffect(() => {
        if (studentId || initialStudent?.id) {
            fetchProfileData((studentId || initialStudent.id) as any);
        }
    }, [studentId, initialStudent?.id, fetchProfileData]);

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

    // Fully static class strings (Tailwind can't detect classes built by string
    // interpolation at build time, so those would silently purge from the CSS).
    const GRADE_BADGE_CLASSES: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-emerald-100 text-emerald-700',
        purple: 'bg-purple-100 text-purple-700',
        pink: 'bg-pink-100 text-pink-700',
        indigo: 'bg-indigo-100 text-indigo-700',
    };

    // Build a real PDF transcript from the student's own data (name, ID, class,
    // average, and each subject's published score) instead of printing the page.
    const handleDownloadTranscript = async () => {
        const toastId = toast.loading('Generating transcript...');
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const rows = (performance || [])
                .map((p: any) => `<tr>
                    <td style="border:1px solid #ddd;padding:6px">${p.subject || ''}</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:center">${p.score ?? '-'}%</td>
                    <td style="border:1px solid #ddd;padding:6px;text-align:center">${getGradeLetter(Number(p.score) || 0)}</td>
                </tr>`).join('');
            const el = document.createElement('div');
            el.innerHTML = `
                <div style="font-family:Arial,sans-serif;padding:24px;color:#1f2937">
                    <h2 style="margin:0 0 12px">Academic Transcript</h2>
                    <p style="margin:0 0 16px;line-height:1.6">
                        <b>Name:</b> ${student.name || ''}<br/>
                        <b>Student ID:</b> ${student.school_generated_id || student.admission_number || ''}<br/>
                        <b>Class:</b> ${student.class_name || ('Grade ' + (student.grade || ''))}<br/>
                        <b>Overall Average:</b> ${stats.averageScore}%
                    </p>
                    <table style="border-collapse:collapse;width:100%;font-size:13px">
                        <thead><tr style="background:#fff7ed">
                            <th style="border:1px solid #ddd;padding:6px;text-align:left">Subject</th>
                            <th style="border:1px solid #ddd;padding:6px">Score</th>
                            <th style="border:1px solid #ddd;padding:6px">Grade</th>
                        </tr></thead>
                        <tbody>${rows || '<tr><td colspan="3" style="border:1px solid #ddd;padding:10px;text-align:center;color:#6b7280">No published results yet.</td></tr>'}</tbody>
                    </table>
                </div>`;
            await html2pdf().set({
                filename: `Transcript_${(student.name || 'Student').replace(/\s+/g, '_')}.pdf`,
                margin: 10,
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            }).from(el).save();
            toast.success('Transcript downloaded', { id: toastId });
        } catch (err) {
            console.error('Transcript error:', err);
            toast.error('Could not generate transcript', { id: toastId });
        }
    };

    // Performance Overview rows: one per admin-assigned subject. A subject only
    // shows a score once a result is PUBLISHED for it (from a published report
    // card); until then it reads "No result yet". Where a subject has been
    // published across more than one term (First/Second/Third), the score
    // shown is the average across those terms — the same combined annual
    // result as the Academic Performance Dashboard's Third Term view —
    // rather than whichever term happened to be processed last.
    const overviewRows = useMemo(() => {
        const scoresBySubject = new Map<string, number[]>();
        reportCards
            .filter((rc: any) => rc?.is_published && CANONICAL_TERMS.includes(rc?.term))
            .forEach((rc: any) => {
                const records = Array.isArray(rc.academic_records) ? rc.academic_records : [];
                records.forEach((r: any) => {
                    const name = (r?.subject || '').toString().trim().toLowerCase();
                    const score = Number(r?.total ?? r?.score);
                    if (name && !Number.isNaN(score)) {
                        if (!scoresBySubject.has(name)) scoresBySubject.set(name, []);
                        scoresBySubject.get(name)!.push(score);
                    }
                });
            });

        const publishedScores = new Map<string, number>();
        scoresBySubject.forEach((scores, name) => {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            publishedScores.set(name, Math.round(avg * 10) / 10);
        });

        // Subjects to list: admin-assigned set first; fall back to any subjects
        // that already have published scores so nothing published is hidden.
        const names = assignedSubjects.length > 0
            ? assignedSubjects
            : Array.from(publishedScores.keys());

        return names.map((name) => {
            const score = publishedScores.get(name.toString().trim().toLowerCase());
            return { subject: name, score: score == null ? null : score };
        });
    }, [assignedSubjects, reportCards]);

    // Optimistic UI: only block the whole screen on the very first load (no
    // student data yet). Background re-syncs (real-time updates via useAutoSync)
    // set `loading` again but must not blank out an already-rendered profile.
    if (!student) {
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
            {/* Thin top progress bar for background re-syncs — keeps the already-
                rendered profile visible instead of blanking it on every refetch. */}
            {loading && (
                <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-orange-100 overflow-hidden">
                    <motion.div
                        className="h-full bg-orange-500"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>
            )}
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
                                                    {student.first_name ? (
                                                        `${student.first_name?.[0]}${student.last_name?.[0] || ''}`
                                                    ) : (
                                                        student.name?.[0] || 'S'
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-lg"></div>
                                </div>

                                {/* Name & Title */}
                                <div className="text-center sm:text-left">
                                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
                                        {student.first_name ? `${student.first_name} ${student.last_name || ''}` : (student.name || 'Student Profile')}
                                    </h1>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-4">
                                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            {student.class_name || `Grade ${student.grade}`}
                                        </Badge>
                                        {student.curriculum_type && (
                                            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold">
                                                <Globe className="w-4 h-4 mr-2" />
                                                {student.curriculum_type === 'Both' ? 'Nigerian & British Curriculum' : `${student.curriculum_type} Curriculum`}
                                            </Badge>
                                        )}
                                        <motion.button
                                            type="button"
                                            whileHover={{ opacity: 0.85 }}
                                            whileTap={{ scale: 0.96 }}
                                            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                            onClick={() => copyToClipboard(student.school_generated_id || student.admission_number || '')}
                                            aria-label="Copy student ID to clipboard"
                                        >
                                            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-1.5 text-sm flex items-center gap-2">
                                                ID: {student.school_generated_id || student.admission_number || 'Pending'}
                                                <Copy className="w-3 h-3 opacity-70" />
                                                {copied && <span className="text-xs ml-1">Copied!</span>}
                                            </Badge>
                                        </motion.button>
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
                                <MotionList className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" stagger={0.06}>
                                    <MotionListItem>
                                        <StatCard
                                            icon={<TrendingUp className="w-5 h-5" />}
                                            label="Attendance"
                                            value={`${stats.attendanceRate}%`}
                                            trend={stats.attendanceRate > 90 ? "+ Good" : "Needs Imp."}
                                            trendUp={stats.attendanceRate > 90}
                                        />
                                    </MotionListItem>
                                    <MotionListItem>
                                        <StatCard
                                            icon={<Award className="w-5 h-5" />}
                                            label="Average"
                                            value={`${stats.averageScore}%`}
                                            trend={stats.averageScore > 75 ? "+ Good" : "Fair"}
                                            trendUp={stats.averageScore > 75}
                                        />
                                    </MotionListItem>
                                    <MotionListItem>
                                        <StatCard
                                            icon={<BookOpen className="w-5 h-5" />}
                                            label="Performance"
                                            value={performance.length.toString()}
                                            badge="Subjects"
                                        />
                                    </MotionListItem>
                                    <MotionListItem>
                                        <StatCard
                                            icon={<Target className="w-5 h-5" />}
                                            label="Submitted"
                                            value={stats.assignmentsSubmitted.toString()}
                                            badge="Assign."
                                        />
                                    </MotionListItem>
                                </MotionList>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
                                    <Button onClick={handleDownloadTranscript} className="w-full sm:w-auto !bg-white !text-orange-700 hover:!bg-orange-50 shadow-lg font-bold order-2 sm:order-1">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Transcript
                                    </Button>
                                    <Button onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(window.location.href);
                                            toast.success('Profile link copied to clipboard!');
                                        } catch {
                                            toast.error('Could not copy link. Please copy it from the address bar.');
                                        }
                                    }} className="w-full sm:w-auto !bg-white/10 !text-white border border-white/30 hover:!bg-white/20 backdrop-blur-sm order-1 sm:order-2">
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share Profile
                                    </Button>
                                    {navigateTo && (
                                        <>
                                            <Button onClick={() => navigateTo('editProfile', 'Edit Profile')} className="w-full sm:w-auto !bg-white/10 !text-white border border-white/30 hover:!bg-white/20 backdrop-blur-sm order-3">
                                                <Settings className="w-4 h-4 mr-2" />
                                                Edit Profile
                                            </Button>
                                            <Button onClick={() => navigateTo('changePassword', 'Change Password')} className="w-full sm:w-auto !bg-white/10 !text-white border border-white/30 hover:!bg-white/20 backdrop-blur-sm order-4">
                                                <Lock className="w-4 h-4 mr-2" />
                                                Change Password
                                            </Button>
                                        </>
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
                    <Tabs defaultValue={initialTab || 'overview'} className="w-full">
                        {/* TabsList must be a direct child of Tabs — MotionTabs only injects
                            activeTab/setActiveTab into its immediate children, so wrapping this
                            in a plain <div> silently breaks tab switching entirely. */}
                        <TabsList className="!flex !w-full !justify-start !rounded-none !bg-slate-50/50 !h-auto !p-0 gap-6 border-b border-slate-200 px-6">
                            <TabsTrigger
                                value="overview"
                                className="!bg-transparent data-[state=active]:!text-orange-600 data-[state=active]:!border-orange-600 !border-b-2 border-transparent !shadow-none rounded-none px-0 pb-4 pt-4 font-semibold !text-gray-500"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="academic"
                                className="!bg-transparent data-[state=active]:!text-orange-600 data-[state=active]:!border-orange-600 !border-b-2 border-transparent !shadow-none rounded-none px-0 pb-4 pt-4 font-semibold !text-gray-500"
                            >
                                Academic
                            </TabsTrigger>
                            <TabsTrigger
                                value="activities"
                                className="!bg-transparent data-[state=active]:!text-orange-600 data-[state=active]:!border-orange-600 !border-b-2 border-transparent !shadow-none rounded-none px-0 pb-4 pt-4 font-semibold !text-gray-500"
                            >
                                Activities
                            </TabsTrigger>
                            <TabsTrigger
                                value="documents"
                                className="!bg-transparent data-[state=active]:!text-orange-600 data-[state=active]:!border-orange-600 !border-b-2 border-transparent !shadow-none rounded-none px-0 pb-4 pt-4 font-semibold !text-gray-500"
                            >
                                Documents
                            </TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="p-6 lg:p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column -2/3 */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Personal Information */}
                                    <Card className="border-slate-200 shadow-sm">
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
                                                <InfoField icon={<Phone />} label="Phone Number" value={student.phone || student.parentPhone || 'N/A'} />
                                                <InfoField icon={<Calendar />} label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} />
                                                <InfoField icon={<MapPin />} label="Address" value={student.address || 'N/A'} />
                                                <InfoField icon={<User />} label="Guardian" value={student.parentName || student.guardian_name || 'N/A'} />
                                                <InfoField icon={<Phone />} label="Guardian Contact" value={student.parentPhone || student.guardian_phone || 'N/A'} />
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
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                            <CardTitle className="flex items-center gap-3 text-lg">
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                                </div>
                                                Performance Overview
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <MotionList className="space-y-5" stagger={0.05}>
                                                {overviewRows.length > 0 ? overviewRows.map((p, i) => (
                                                    <MotionListItem key={i}>
                                                        {p.score == null ? (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-semibold text-slate-700">{p.subject}</span>
                                                                <span className="text-xs font-medium text-slate-400 italic">No result yet</span>
                                                            </div>
                                                        ) : (
                                                            <PerformanceBar
                                                                subject={p.subject}
                                                                score={p.score}
                                                                grade={getGradeLetter(p.score)}
                                                                color={getGradeColor(p.score)}
                                                            />
                                                        )}
                                                    </MotionListItem>
                                                )) : (
                                                    <div className="text-center py-4 text-slate-500">No subjects assigned yet.</div>
                                                )}
                                            </MotionList>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column - 1/3 */}
                                <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
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
                                            <MotionList stagger={0.05}>
                                                {events.length > 0 ? events.map((event, i) => (
                                                    <MotionListItem key={i}>
                                                        <EventItem
                                                            date={new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                            title={event.title}
                                                            time={event.type === 'Assignment' ? 'Due Date' : new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        />
                                                    </MotionListItem>
                                                )) : (
                                                    <div className="p-4 text-center text-slate-500 text-sm">No upcoming events.</div>
                                                )}
                                            </MotionList>
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
                                            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                                <tr>
                                                    <th className="sticky left-0 z-10 bg-slate-50 px-6 py-4 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">Subject</th>
                                                    <th className="px-6 py-4">Assessment</th>
                                                    <th className="px-6 py-4">Score</th>
                                                    <th className="px-6 py-4">Grade</th>
                                                    <th className="px-6 py-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {performance.length > 0 ? performance.map((p, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="sticky left-0 z-[5] bg-white px-6 py-4 font-medium text-slate-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">{p.subject}</td>
                                                        <td className="px-6 py-4 text-slate-500">{p.term || p.assessment_type || 'Term Record'}</td>
                                                        <td className="px-6 py-4 font-semibold">{p.score}%</td>
                                                        <td className="px-6 py-4">
                                                            <Badge className={`${GRADE_BADGE_CLASSES[getGradeColor(p.score)]} border-0`}>
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
                            <MotionList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" stagger={0.06}>
                                {activities.length > 0 ? activities.map((activity, i) => {
                                    const palette = ACTIVITY_COLOR_PALETTE[i % ACTIVITY_COLOR_PALETTE.length];
                                    return (
                                    <MotionListItem key={i}>
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                                        <div className={`w-12 h-12 rounded-lg ${palette.iconBg} ${palette.iconText} flex items-center justify-center mb-4`}>
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">{activity.name}</h3>
                                        <p className="text-sm text-slate-500 mb-4">{activity.role}</p>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4">
                                            <Clock className="w-3 h-3" />
                                            {activity.schedule}
                                        </div>
                                        <Badge className={`${palette.badgeBg} ${palette.badgeText} ${palette.badgeBorder}`}>
                                            {activity.status}
                                        </Badge>
                                    </div>
                                    </MotionListItem>
                                    );
                                }) : (
                                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border-2 border-dashed border-slate-200">
                                        No extracurricular activities recorded yet.
                                    </div>
                                )}
                                {/* Add New Activity Button */}
                                <button
                                    type="button"
                                    onClick={() => navigateTo?.('extracurriculars', 'Extracurriculars')}
                                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50/50 transition-all cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-orange-100">
                                        <span className="text-2xl font-light">+</span>
                                    </div>
                                    <span className="font-medium">Join New Activity</span>
                                </button>
                            </MotionList>
                        </TabsContent>

                        <TabsContent value="documents" className="p-6 lg:p-8">
                            <Card className="border-slate-200 shadow-sm">
                                 <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                                    <CardTitle>Student Documents</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            id="doc-upload"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                        <Button 
                                            size="sm" 
                                            className="bg-orange-600 hover:bg-orange-700 text-white"
                                            onClick={() => document.getElementById('doc-upload')?.click()}
                                        >
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Upload New
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="divide-y divide-slate-100">
                                    <MotionList stagger={0.05}>
                                        {documents.length > 0 ? documents.map((doc, i) => (
                                            <MotionListItem key={i}>
                                                <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
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
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="hidden sm:flex"
                                                        onClick={() => {
                                                            if (!doc.url) { toast.error('No file available for this document.'); return; }
                                                            window.open(doc.url, '_blank', 'noopener,noreferrer');
                                                        }}
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </Button>
                                                </div>
                                            </MotionListItem>
                                        )) : (
                                            <div className="p-12 text-center text-slate-500">
                                                No documents available for download.
                                            </div>
                                        )}
                                    </MotionList>
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
        blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
        green: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700' },
        purple: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
        pink: { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700' },
        indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700' },
    };

    return (
        <div className="group">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">{subject}</span>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">{score}%</span>
                    <Badge className={`${colorMap[color].light} ${colorMap[color].text} border-0 text-xs`}>
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

