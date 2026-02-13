import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    MicrophoneIcon,
    VideoIcon,
    ShareIcon,
    UsersIcon,
    MessagesIcon,
    ChevronDownIcon,
} from '../../constants';
// Removed unused imports like StopIcon/BellIcon to clean up

import { mockStudents } from '../../data';

// --- Customized Icons for Premium Feel ---
const XIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const HandIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const GridViewIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const FullScreenIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>;
const DotsHorizontalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>;
const ReactionIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;



const parseClassName = (name: string) => {
    const clean = name.trim();
    let grade = 0;
    let section = '';

    // Regex patterns
    const preNurseryMatch = clean.match(/^Pre-Nursery/i);
    const nurseryMatch = clean.match(/^Nursery\s*(\d+)\s*(.*)$/i);
    const basicMatch = clean.match(/^Basic\s*(\d+)\s*(.*)$/i);
    const standardMatch = clean.match(/^(?:Grade|Year|Primary)?\s*(\d+)\s*(.*)$/i);
    const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
    const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i); // Matches SS, SSS

    if (preNurseryMatch) {
        grade = 0;
        // section might be tricky if not captured, but Pre-Nursery usually has no section or explicitly named
    } else if (nurseryMatch) {
        grade = parseInt(nurseryMatch[1]); // 1 -> 1 (Nursery 1)
        section = nurseryMatch[2];
    } else if (basicMatch) {
        grade = 2 + parseInt(basicMatch[1]); // 1 -> 3 (Basic 1)
        section = basicMatch[2];
    } else if (standardMatch) {
        const val = parseInt(standardMatch[1]);
        // Assumption: "Grade 1" = Basic 1 = 3. 
        // "Grade 5" = Basic 5 = 7.
        // If val is 1-5, map to Basic (3-7).
        grade = 2 + val;
        section = standardMatch[2];
    } else if (jsMatch) {
        grade = 8 + parseInt(jsMatch[1]); // 1 -> 9 (JSS 1)
        section = jsMatch[2];
    } else if (ssMatch) {
        grade = 11 + parseInt(ssMatch[1]); // 1 -> 12 (SSS 1)
        section = ssMatch[2];
    }

    if (section) {
        section = section.replace(/^[-–]\s*/, '').trim();
    }
    return { grade, section };
};

interface ParticipantProps {
    name: string;
    isMuted: boolean;
    isCameraOff: boolean;
    isSpeaking?: boolean;
    isHandRaised?: boolean;
    avatarUrl?: string;
}

const AudioVisualizer: React.FC = () => (
    <div className="flex items-center space-x-1 h-4">
        <div className="w-1 bg-green-500 rounded-full animate-musical-bar-1 h-3"></div>
        <div className="w-1 bg-green-500 rounded-full animate-musical-bar-2 h-4"></div>
        <div className="w-1 bg-green-500 rounded-full animate-musical-bar-3 h-2"></div>
    </div>
);

const ParticipantTile: React.FC<ParticipantProps & { size: 'xs' | 'sm' | 'md' | 'lg' | 'featured' }> = ({ name, isMuted, isCameraOff, isSpeaking, isHandRaised, size, avatarUrl }) => {

    // Dynamic sizing classes for responsiveness
    // Using relative units and breakpoints for fluid transitions
    const sizeClasses = {
        xs: 'h-20 w-20 md:h-24 md:w-24 min-w-[5rem]',
        sm: 'h-28 w-36 md:h-32 md:w-44 min-w-[9rem]',
        md: 'h-40 md:h-48 lg:h-56',
        lg: 'h-56 md:h-64 lg:h-72',
        featured: 'h-full w-full absolute inset-0'
    };

    const avatarSizes = {
        xs: 'w-8 h-8 text-xs',
        sm: 'w-10 h-10 md:w-12 md:h-12 text-sm',
        md: 'w-14 h-14 md:w-16 md:h-16 text-xl',
        lg: 'w-20 h-20 md:w-24 md:h-24 text-2xl',
        featured: 'w-24 h-24 md:w-32 md:h-32 text-2xl md:text-4xl'
    };

    return (
        <div className={`relative group overflow-hidden rounded-xl md:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${sizeClasses[size]} w-full bg-slate-100 border border-slate-200`}>
            {/* Active Speaker Gradient Border Effect */}
            {isSpeaking && <div className="absolute inset-0 border-2 border-green-400 rounded-xl md:rounded-2xl z-10 pointer-events-none animate-pulse"></div>}

            {/* Video/Content Layer */}
            <div className={`absolute inset-0 flex items-center justify-center ${isCameraOff ? 'bg-gradient-to-br from-slate-100 to-slate-200' : 'bg-slate-900'}`}>
                {isCameraOff ? (
                    <div className={`rounded-full flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 ${avatarSizes[size]}`}>
                        {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover border-2 border-white/20" /> : name.charAt(0)}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center relative">
                        {/* Mock Video Placeholder */}
                        <div className="w-full h-full bg-slate-800 opacity-40"></div>
                        <VideoIcon className={`text-slate-600 absolute opacity-20 ${size === 'xs' ? 'w-5 h-5' : 'w-10 h-10 md:w-12 md:h-12'}`} />
                    </div>
                )}
            </div>

            {/* Status Overlays */}
            <div className="absolute top-2 right-2 flex space-x-1 z-20">
                {isHandRaised && (
                    <div className="bg-yellow-400 text-white p-1 rounded-full shadow-lg animate-bounce-subtle">
                        <HandIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </div>
                )}
                {isMuted && (
                    <div className="bg-red-500/90 text-white p-1 rounded-full shadow-lg backdrop-blur-md">
                        <MicrophoneIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </div>
                )}
            </div>

            {/* Name Tag */}
            <div className={`absolute bottom-2 left-2 z-20 max-w-[90%]`}>
                <div className={`flex items-center space-x-1.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg shadow-sm border border-white/50 ${size === 'xs' ? 'scale-75 origin-bottom-left' : ''}`}>
                    {isSpeaking ? (
                        <AudioVisualizer />
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    )}
                    <span className="text-[10px] md:text-xs font-semibold text-slate-800 truncate select-none">{name}</span>
                </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
        </div>
    );
};

const ChatBubble: React.FC<{ name: string, message: string, time: string, isYou?: boolean }> = ({ name, message, time, isYou }) => (
    <div className={`flex flex-col ${isYou ? 'items-end' : 'items-start'} mb-4 animate-slide-in-up`}>
        <div className="flex items-baseline space-x-2 mb-1 px-1">
            <span className={`text-xs font-bold ${isYou ? 'text-indigo-600' : 'text-slate-600'}`}>{name}</span>
            <span className="text-[10px] text-slate-400">{time}</span>
        </div>
        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed ${isYou ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
            {message}
        </div>
    </div>
);

// --- Class Selection Component with Green Room ---
interface ClassSession {
    id: string;
    grade: string;
    subject: string;
    description: string;
    time: string;
    studentsCount: number;
}

const ClassSelectionScreen: React.FC<{
    onStartClass: (session: ClassSession, subject: string, topic: string, duration: string, initialMuted: boolean, initialCameraOff: boolean) => void;
    userId?: string;
    schoolId?: string;
}> = ({ onStartClass, userId, schoolId }) => {
    const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState('60'); // Minutes
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [loading, setLoading] = useState(true);

    // Green Room State
    const [lobbyMuted, setLobbyMuted] = useState(false);
    const [lobbyCameraOff, setLobbyCameraOff] = useState(false);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const fetchClasses = async () => {
            if (!userId || !schoolId) return;

            try {
                // 1. Get Teacher Profile for this school
                const { data: teacherProfiles } = await supabase
                    .from('teachers')
                    .select('id, school_id')
                    .eq('user_id', userId)
                    .eq('school_id', schoolId);

                const activeTeacherId = teacherProfiles?.[0]?.id;

                if (!activeTeacherId) {
                    setClasses([]);
                    setLoading(false);
                    return;
                }

                const finalClasses: ClassSession[] = [];
                const addedClassKeys = new Set<string>();
                const { getGradeDisplayName } = await import('../../lib/schoolSystem');

                // 2. Modern: class_teachers
                const { data: teacherClassesData } = await supabase
                    .from('class_teachers')
                    .select(`
                        classes:class_id (
                            id, grade, section, subject, student_count
                        )
                    `)
                    .eq('teacher_id', activeTeacherId);

                if (teacherClassesData) {
                    teacherClassesData.forEach((item: any) => {
                        const c = item.classes;
                        if (c) {
                            const key = c.id;
                            if (!addedClassKeys.has(key)) {
                                finalClasses.push({
                                    id: c.id,
                                    grade: `${getGradeDisplayName(c.grade)} - Section ${c.section}`,
                                    subject: c.subject || 'General',
                                    description: `Class Session for ${getGradeDisplayName(c.grade)} ${c.section}`,
                                    time: 'Now',
                                    studentsCount: c.student_count || 0
                                });
                                addedClassKeys.add(key);
                            }
                        }
                    });
                }

                // 3. Legacy: teacher_classes fallback
                const { data: legacyAssignments } = await supabase
                    .from('teacher_classes')
                    .select('class_name')
                    .eq('teacher_id', activeTeacherId);

                if (legacyAssignments && legacyAssignments.length > 0) {
                    const { data: allClasses } = await supabase
                        .from('classes')
                        .select('*')
                        .eq('school_id', schoolId);

                    if (allClasses) {
                        const normalize = (s: string) => s.replace(/Grade|Year|JSS|SSS|SS|\s/gi, '').toUpperCase();

                        legacyAssignments.forEach((legacy: any) => {
                            const name = legacy.class_name;
                            if (!name) return;
                            const parsed = parseClassName(name);

                            const matches = allClasses.filter(c => {
                                if (c.grade === parsed.grade) {
                                    if (parsed.section) {
                                        return normalize(c.section || '') === normalize(parsed.section);
                                    }
                                    return true;
                                }
                                return false;
                            });

                            matches.forEach(match => {
                                const key = match.id;
                                if (!addedClassKeys.has(key)) {
                                    finalClasses.push({
                                        id: match.id,
                                        grade: `${getGradeDisplayName(match.grade)} - Section ${match.section}`,
                                        subject: match.subject || 'General',
                                        description: `Class Session for ${getGradeDisplayName(match.grade)} ${match.section}`,
                                        time: 'Now',
                                        studentsCount: match.student_count || 0
                                    });
                                    addedClassKeys.add(key);
                                }
                            });
                        });
                    }
                }

                setClasses(finalClasses);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, [userId, schoolId]);

    useEffect(() => {
        if (selectedClass) {
            setSubject(selectedClass.subject);
        }
    }, [selectedClass]);

    // Effect for Lobby Camera Preview
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (!lobbyCameraOff) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(s => {
                    stream = s;
                    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = s;
                })
                .catch(err => {
                    console.error("Lobby Camera Error:", err);
                    setLobbyCameraOff(true);
                });
        }
        return () => {
            stream?.getTracks().forEach(t => t.stop());
        };
    }, [lobbyCameraOff]);


    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50 p-4 md:p-8">
            <div className="w-full max-w-6xl space-y-6 md:space-y-8 animate-fade-in-up">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Classroom Lobby</h1>
                    <p className="text-slate-500 text-sm md:text-base">Configure your session details and check your equipment.</p>
                </div>

                <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
                    {/* Left: Class List (4 cols) */}
                    <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
                        <div className="flex items-center space-x-2 text-slate-700 font-semibold mb-2">
                            <CalendarIcon className="w-5 h-5 text-indigo-500" />
                            <h2>Classes</h2>
                        </div>
                        <div className="space-y-3 h-[400px] overflow-y-auto custom-scrollbar lg:pr-2">
                            {loading && <p className="text-center text-slate-400 py-4">Loading classes...</p>}
                            {!loading && classes.length === 0 && <p className="text-center text-slate-400 py-4">No classes found.</p>}
                            {classes.map((cls) => (
                                <div key={cls.id}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md relative group ${selectedClass?.id === cls.id ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="pr-2">
                                            <h3 className={`font-bold text-sm md:text-base ${selectedClass?.id === cls.id ? 'text-indigo-900' : 'text-slate-800'}`}>{cls.grade}</h3>
                                            <p className={`text-xs md:text-sm font-medium ${selectedClass?.id === cls.id ? 'text-indigo-700' : 'text-slate-600'}`}>{cls.subject}</p>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cls.description}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="block text-[10px] md:text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">{cls.time}</span>
                                            <span className="block text-[10px] text-slate-400 mt-1">{cls.studentsCount} Students</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Green Room & Setup (8 cols) */}
                    <div className="lg:col-span-8 bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col md:flex-row gap-6 order-1 lg:order-2">

                        {/* Column 1: Config Fields */}
                        <div className="flex-1 space-y-5">
                            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">Session Details</h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Class Subject</label>
                                <input
                                    type="text"
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm bg-slate-50 font-semibold text-slate-800"
                                    placeholder="e.g. Mathematics"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Duration</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['30', '45', '60', '90'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setDuration(m)}
                                            className={`py-2 px-1 rounded-lg text-sm font-medium border transition-all ${duration === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                        >
                                            {m}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Agenda / Topic</label>
                                <textarea
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none h-24 text-sm bg-slate-50"
                                    placeholder="Enter today's lesson topic..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Column 2: Preview & Actions */}
                        <div className="flex-1 flex flex-col space-y-6">
                            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2 hidden md:block">Preview</h3>

                            {/* Audio/Video Preview */}
                            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center group ring-1 ring-black/5">
                                <video ref={videoPreviewRef} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${lobbyCameraOff ? 'opacity-0' : 'opacity-100'}`} />
                                {lobbyCameraOff && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                        <div className="text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2">
                                                <VideoIcon className="w-8 h-8 opacity-50" />
                                            </div>
                                            <span className="text-sm font-medium">Camera is off</span>
                                        </div>
                                    </div>
                                )}

                                {/* Controls Overlay */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                                    <button onClick={() => setLobbyMuted(!lobbyMuted)} className={`p-2.5 rounded-full transition-all ${lobbyMuted ? 'bg-red-500 text-white shadow-red-500/50 shadow-sm' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
                                        <MicrophoneIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setLobbyCameraOff(!lobbyCameraOff)} className={`p-2.5 rounded-full transition-all ${lobbyCameraOff ? 'bg-red-500 text-white shadow-red-500/50 shadow-sm' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
                                        <VideoIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto pt-4">
                                <button
                                    disabled={!selectedClass}
                                    onClick={() => selectedClass && onStartClass(selectedClass, subject, topic, duration, lobbyMuted, lobbyCameraOff)}
                                    className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 text-sm md:text-base ${!selectedClass ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300'}`}
                                >
                                    <VideoIcon className="w-5 h-5" />
                                    <span>{selectedClass ? 'Start Class Session' : 'Select a Class First'}</span>
                                </button>
                                <p className="text-xs text-center text-slate-400 mt-3 flex items-center justify-center">
                                    <ShareIcon className="w-3 h-3 mr-1" />
                                    Students will be notified automatically
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


const VirtualClassScreen: React.FC = () => {
    const { user, currentSchool } = useAuth();
    // Session State
    const [activeSession, setActiveSession] = useState<{ classDetails: ClassSession, subject: string, topic: string, duration: string } | null>(null);

    // Call State
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'participants' | 'chat'>('chat');
    const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('speaker');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showReactions, setShowReactions] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Mock Data
    const participants = mockStudents.slice(0, 12).map((s, i) => ({
        name: s.name,
        avatarUrl: s.avatarUrl,
        isMuted: i % 3 === 0,
        isCameraOff: i % 5 === 0,
        isSpeaking: i === 2,
        isHandRaised: i % 7 === 0,
        id: s.id
    }));

    // Effects for Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Effect for Session Timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (activeSession) {
            timer = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(timer);
    }, [activeSession]);

    // Format seconds to mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!activeSession) return;

        // Important: In a real app, we would take the already active stream from the Green Room
        // For this demo, we re-request it to keep logic simple but consistent
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Apply initial muted/camera state
                    stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
                    stream.getVideoTracks().forEach(t => t.enabled = !isCameraOff);
                }
            } catch (error) {
                console.error("Camera access:", error);
                setIsCameraOff(true);
            }
        };
        if (!isCameraOff || isMuted) startCamera(); // Try to start even if camera is off, for audio

        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [activeSession]); // Only run on session start

    // Update tracks when toggles change during call
    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(t => t.enabled = !isMuted);
            streamRef.current.getVideoTracks().forEach(t => t.enabled = !isCameraOff);
        }
    }, [isMuted, isCameraOff]);

    const toggleMute = () => setIsMuted(prev => !prev);
    const toggleCamera = () => setIsCameraOff(prev => !prev);

    const scrollParticipants = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            const newScrollLeft = direction === 'left'
                ? scrollContainerRef.current.scrollLeft - scrollAmount
                : scrollContainerRef.current.scrollLeft + scrollAmount;

            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });
        }
    };

    const handleStartClass = async (cls: ClassSession, subject: string, topic: string, duration: string, initialMuted: boolean, initialCameraOff: boolean) => {
        setIsMuted(initialMuted);
        setIsCameraOff(initialCameraOff);
        setActiveSession({ classDetails: cls, subject, topic, duration });

        if (user) {
            try {
                // 1. Get School ID
                const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single();
                const schoolId = profile?.school_id;

                if (!schoolId) {
                    toast.error('School ID not found. Cannot start session.');
                    return;
                }

                // 2. Start the Session
                const { data: session, error } = await supabase.from('virtual_class_sessions').insert({
                    teacher_id: user.id,
                    class_id: cls.id,
                    school_id: schoolId, // Added school_id
                    subject: subject,
                    topic: topic,
                    status: 'active',
                    start_time: new Date().toISOString(),
                    meeting_link: 'internal_jitsi'
                }).select().single();

                if (error) throw error;

                // 3. Send Notification to all students in that class
                // We use the 'audience' field to target the specific class
                await supabase.from('notifications').insert({
                    school_id: schoolId,
                    title: `🎬 Live Class: ${subject}`,
                    message: `Your ${subject} class is starting now. Click to join!`,
                    category: 'System',
                    audience: [`Grade ${cls.grade}`], // Target by grade (matches audience logic in NotificationsScreen)
                    related_id: session.id,
                    is_read: false
                });

                toast.success('Class session started live!');
            } catch (e: any) {
                console.error('Error starting session:', e);
                toast.error('Failed to start session: ' + e.message);
            }
        }
    };

    // --- Render Logic ---

    // Derived State for Layout
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024; // Simple check, resize listener better in real app

    if (!activeSession) {
        return <ClassSelectionScreen onStartClass={handleStartClass} userId={user?.id} schoolId={currentSchool?.id} />;
    }

    return (
        <div className="flex bg-slate-50 h-[calc(100vh-64px)] w-full overflow-hidden font-sans text-slate-900">

            {/* Main Stage Area (Flex-1) */}
            <div className={`flex-1 flex flex-col h-full relative z-0 transition-all duration-300 ease-in-out overflow-hidden`}>

                {/* 1. Header Pill (Absolute Top) */}
                <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none px-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-sm rounded-full px-4 py-2 flex items-center justify-between w-full max-w-3xl md:w-auto md:space-x-8 pointer-events-auto transition-all">
                        <div className="flex items-center space-x-2 md:space-x-4 overflow-hidden">
                            <div className="flex flex-col items-center leading-none">
                                <span className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-wide flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> REC
                                </span>
                                <span className="text-[10px] md:text-xs font-mono text-slate-500 mt-0.5 w-[35px] text-center">{formatTime(elapsedTime)}</span>
                            </div>

                            <div className="h-6 w-px bg-slate-200 mx-1 md:mx-0 flex-shrink-0"></div>

                            <div className="flex flex-col overflow-hidden">
                                <div className="flex items-baseline space-x-2">
                                    <h2 className="text-xs md:text-sm font-bold text-slate-800 truncate max-w-[100px] md:max-w-[160px]">{activeSession.classDetails.grade}</h2>
                                    <span className="hidden sm:inline text-xs md:text-sm font-semibold text-indigo-600 truncate">{activeSession.subject}</span>
                                </div>
                                <span className="text-[10px] md:text-xs text-slate-500 truncate max-w-[140px] md:max-w-xs">{activeSession.topic || 'No topic set'}</span>
                            </div>
                        </div>
                        <div className="text-[10px] md:text-xs font-medium text-slate-500 font-mono hidden sm:block flex-shrink-0 border-l border-slate-200 pl-4 ml-4">
                            Ends in {parseInt(activeSession.duration) - Math.floor(elapsedTime / 60)}m
                        </div>
                    </div>
                </div>

                {/* 2. Top Right View Toggle */}
                <div className="absolute top-4 right-4 z-20 hidden md:block">
                    <button onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')} className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl transition text-slate-600 hover:text-indigo-600">
                        {viewMode === 'grid' ? <FullScreenIcon className="w-5 h-5" /> : <GridViewIcon className="w-5 h-5" />}
                    </button>
                </div>

                {/* 3. Main Content (Video/Grid) */}
                <div
                    onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
                    className="flex-1 w-full h-full flex flex-col items-center justify-center p-2 md:p-4 overflow-hidden relative"
                >
                    {/* Fixed Container for Video/Grid - No Scroll */}
                    <div className="w-full h-full flex flex-col items-center pt-16 pb-20 overflow-hidden">
                        {viewMode === 'speaker' ? (
                            <div className="w-full max-w-6xl flex flex-col h-full justify-center items-center gap-2">
                                {/* Featured Speaker */}
                                <div className="w-full flex-1 min-h-0 flex justify-center items-center">
                                    <div className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-white shadow-xl border border-slate-100 ring-1 ring-black/5 group w-full max-w-5xl h-full max-h-full aspect-video md:aspect-auto object-contain">
                                        <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isCameraOff ? 'hidden' : 'block'}`} />
                                        {isCameraOff && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-slate-200">
                                                <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl md:text-4xl font-bold text-white shadow-2xl ring-4 ring-white">Y</div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                                            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-lg border border-white/60">
                                                <AudioVisualizer />
                                                <span className="font-bold text-slate-800 text-xs md:text-sm">You (Host)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Filmstrip - No Scrollbar */}
                                <div className="relative w-full h-24 md:h-28 flex-shrink-0 group max-w-5xl">
                                    <button onClick={() => scrollParticipants('left')} className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 shadow-md rounded-full text-slate-600 opacity-0 group-hover:opacity-100 transition hover:bg-white border border-slate-100 hidden md:block">
                                        <ChevronLeftIcon className="w-5 h-5" />
                                    </button>

                                    <div ref={scrollContainerRef} className="flex space-x-2 overflow-x-auto pb-2 px-1 snap-x items-center h-full w-full mask-image-x no-scrollbar scrollbar-hide">
                                        {participants.map(p => (
                                            <div key={p.id} className="snap-start flex-shrink-0 w-28 md:w-36 h-full">
                                                <ParticipantTile {...p} size="sm" />
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={() => scrollParticipants('right')} className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 shadow-md rounded-full text-slate-600 opacity-0 group-hover:opacity-100 transition hover:bg-white border border-slate-100 hidden md:block">
                                        <ChevronRightIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // GRID VIEW
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 w-full max-w-7xl mx-auto h-full content-start">
                                {/* Self */}
                                <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-sm border-2 border-green-400 w-full aspect-video bg-white">
                                    <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : 'block'}`} />
                                    {isCameraOff && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-600 flex items-center justify-center text-xl md:text-2xl font-bold text-white">Y</div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 bg-white/90 px-2 py-1 rounded text-[10px] md:text-xs backdrop-blur-sm font-bold text-slate-800 shadow-sm">You</div>
                                </div>

                                {/* Others */}
                                {participants.map(p => (
                                    <ParticipantTile key={p.id} {...p} size="sm" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Floating Control Dock - Centered in Main Stage */}
                <div className="absolute bottom-6 left-0 right-0 z-30 flex flex-col items-center justify-end pointer-events-none px-4">

                    {/* Reactions */}
                    <div className="h-10 pointer-events-auto">
                        {showReactions && (
                            <div className="flex space-x-2 bg-white p-2 rounded-full shadow-xl border border-slate-100 animate-slide-in-up mb-3">
                                <button className="p-1.5 hover:bg-slate-100 rounded-full text-xl transition hover:scale-125">👍</button>
                                <button className="p-1.5 hover:bg-slate-100 rounded-full text-xl transition hover:scale-125">👏</button>
                                <button className="p-1.5 hover:bg-slate-100 rounded-full text-xl transition hover:scale-125">🎉</button>
                                <button className="p-1.5 hover:bg-slate-100 rounded-full text-xl transition hover:scale-125">❤️</button>
                            </div>
                        )}
                    </div>

                    {/* Dock */}
                    <div className="bg-white/95 backdrop-blur-2xl border border-white/50 p-2 md:px-6 md:py-2.5 rounded-2xl flex items-center space-x-1 md:space-x-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto max-w-full overflow-x-auto no-scrollbar">
                        <ControlBtn
                            icon={<MicrophoneIcon />}
                            label="Mute"
                            active={isMuted}
                            onClick={toggleMute}
                            activeColor="bg-red-50 text-red-600 border border-red-100"
                            inactiveColor="hover:bg-slate-50 text-slate-600"
                        />
                        <ControlBtn
                            icon={<VideoIcon />}
                            label="Video"
                            active={isCameraOff}
                            onClick={toggleCamera}
                            activeColor="bg-red-50 text-red-600 border border-red-100"
                            inactiveColor="hover:bg-slate-50 text-slate-600"
                        />
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                        <ControlBtn
                            icon={<ReactionIcon className="w-5 h-5 md:w-6 md:h-6" />}
                            label="React"
                            active={showReactions}
                            onClick={() => setShowReactions(!showReactions)}
                            activeColor="bg-orange-50 text-orange-600 border border-orange-100"
                            inactiveColor="hover:bg-slate-50 text-slate-600"
                        />
                        <ControlBtn
                            icon={<HandIcon className="w-5 h-5 md:w-6 md:h-6" />}
                            label="Hand"
                            active={isHandRaised}
                            onClick={() => setIsHandRaised(!isHandRaised)}
                            activeColor="bg-yellow-50 text-yellow-600 border border-yellow-200"
                            inactiveColor="hover:bg-slate-50 text-slate-600"
                        />
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                        <ControlBtn
                            icon={<UsersIcon />}
                            label="People"
                            active={isSidebarOpen && activeSidebarTab === 'participants'}
                            onClick={() => {
                                if (isSidebarOpen && activeSidebarTab === 'participants') {
                                    setIsSidebarOpen(false);
                                } else {
                                    setIsSidebarOpen(true);
                                    setActiveSidebarTab('participants');
                                }
                            }}
                            inactiveColor="hover:bg-slate-50 text-slate-600"
                            activeColor="bg-indigo-50 text-indigo-600 border border-indigo-100"
                        />
                        <ControlBtn
                            icon={<MessagesIcon />}
                            label="Chat"
                            active={isSidebarOpen && activeSidebarTab === 'chat'}
                            onClick={() => {
                                if (isSidebarOpen && activeSidebarTab === 'chat') {
                                    setIsSidebarOpen(false);
                                } else {
                                    setIsSidebarOpen(true);
                                    setActiveSidebarTab('chat');
                                }
                            }}
                            notificationCount={2}
                            inactiveColor="hover:bg-slate-50 text-slate-600"
                            activeColor="bg-indigo-50 text-indigo-600 border border-indigo-100"
                        />

                        {/* End Button */}
                        <div className="pl-1 md:pl-4 md:border-l md:border-slate-200 ml-1 md:ml-4">
                            <button onClick={async () => {
                                if (window.confirm('End class for everyone?')) {
                                    if (user) {
                                        await supabase.from('virtual_class_sessions').update({ status: 'ended', end_time: new Date().toISOString() }).eq('teacher_id', user.id).eq('status', 'active');
                                    }
                                    setActiveSession(null);
                                }
                            }} className="hidden md:block px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-200 transition-transform hover:scale-105 active:scale-95 whitespace-nowrap">
                                End Class
                            </button>
                            <button onClick={() => setActiveSession(null)} className="md:hidden bg-red-600 text-white p-2.5 rounded-xl shadow-lg shadow-red-200">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Session Time Up Notification Overlay */}
                {elapsedTime >= parseInt(activeSession.duration) * 60 && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
                        <div className="bg-red-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 border border-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">Class Duration Reached</span>
                                <span className="text-xs text-red-100">You can wrap up or continue.</span>
                            </div>
                            <button onClick={() => { /* Ideally add logic to dismiss just this notif, but for now it persists or we could add a dismiss state */ }} className="bg-white/20 hover:bg-white/30 p-1 rounded-full transition ml-2">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Sidebar - RESPONSIVE BEHAVIOR */}
            {/* Mobile: Fixed Overlay with Backdrop */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar Container */}
            {/* On Desktop (lg): It is NOT fixed. It is a flex item that slides in. */}
            {/* on Mobile: It IS fixed. */}
            <div className={`
                fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out sm:border-l border-slate-200
                lg:relative lg:shadow-none lg:z-0 lg:transform-none lg:transition-[width,opacity] lg:duration-300 lg:ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                ${isSidebarOpen ? 'lg:w-96 lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden'}
            `}>
                <div className="flex flex-col h-full bg-white/50 backdrop-blur-xl w-full"> {/* Inner wrapper to ensure width stability during transition */}
                    {/* Sidebar Header */}
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/80 shrink-0">
                        <h3 className="font-bold text-lg text-slate-800 tracking-tight whitespace-nowrap">{activeSidebarTab === 'chat' ? 'Messages' : 'Participants'}</h3>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition border border-transparent hover:border-slate-200">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Sidebar Tabs */}
                    <div className="px-5 pt-4 shrink-0">
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button onClick={() => setActiveSidebarTab('chat')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${activeSidebarTab === 'chat' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700 shadow-none'}`}>Chat</button>
                            <button onClick={() => setActiveSidebarTab('participants')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${activeSidebarTab === 'participants' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700 shadow-none'}`}>People ({participants.length + 1})</button>
                        </div>
                    </div>

                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-w-[320px]"> {/* min-w ensures content doesn't squish during transition */}
                        {activeSidebarTab === 'chat' ? (
                            <div className="space-y-6 pb-4">
                                <div className="flex items-center space-x-4">
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Today</span>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                <ChatBubble name="Adebayo" message="Good morning Mrs. Funke! Yes, I can hear you clearly." time="10:24 AM" />
                                <ChatBubble name="Chidinma" message="Can we review the last assignment first?" time="10:25 AM" />
                                <ChatBubble name="You" message="Sure, Chidinma. Let's start with that." time="10:26 AM" isYou />
                                <ChatBubble name="Musa" message="I had trouble with question #3." time="10:28 AM" />
                                <ChatBubble name="Fatima" message="Same here!" time="10:28 AM" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Host Item */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-md ring-2 ring-white">Y</div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 whitespace-nowrap">You (Host)</p>
                                            <div className="flex items-center space-x-1 mt-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                <p className="text-xs text-slate-500">Connected</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button className={`p-2 rounded-lg transition ${isMuted ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-slate-200'}`}><MicrophoneIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 my-2"></div>

                                {/* Participants */}
                                {participants.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition border border-transparent hover:border-slate-100">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold shadow-sm">{p.name.charAt(0)}</div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">{p.name}</p>
                                                {p.isHandRaised && <p className="text-xs text-yellow-600 font-medium flex items-center mt-0.5 animate-pulse"><HandIcon className="w-3 h-3 mr-1" /> Raised Hand</p>}
                                            </div>
                                        </div>
                                        <div className="flex space-x-1 items-center">
                                            {p.isMuted && <MicrophoneIcon className="w-4 h-4 text-red-400" />}
                                            <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition ml-1"><DotsHorizontalIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    {activeSidebarTab === 'chat' && (
                        <div className="p-4 bg-white border-t border-slate-100 pb-8 shrink-0">
                            <div className="relative group">
                                <input type="text" placeholder="Type a message..." className="w-full bg-slate-50 text-slate-800 rounded-2xl pl-5 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition border border-slate-200 focus:border-indigo-200 shadow-sm group-hover:shadow-md" />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 text-white transform active:scale-95">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for control buttons on dock
const ControlBtn: React.FC<{
    icon: React.ReactNode,
    label: string,
    active: boolean,
    onClick: () => void,
    activeColor?: string,
    inactiveColor?: string,
    notificationCount?: number
}> = ({ icon, label, active, onClick, activeColor, inactiveColor, notificationCount }) => (
    <div className="group relative flex flex-col items-center flex-shrink-0">
        {/* ToolTip - Desktop Only */}
        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap hidden md:block z-50">
            {label}
        </div>

        <button onClick={onClick} className={`p-2.5 md:p-3.5 rounded-xl transition-all duration-200 relative ${active ? activeColor : inactiveColor}`}>
            <span className="w-5 h-5 md:w-6 md:h-6">{icon}</span>
            {notificationCount && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm font-bold">
                    {notificationCount}
                </span>
            )}
        </button>
    </div>
);

export default VirtualClassScreen;
