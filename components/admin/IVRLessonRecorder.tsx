import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Phone, Mic, Play, Upload, PhoneCall, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface IVRLesson {
    id: number;
    lesson_title: string;
    subject: string;
    grade: string;
    audio_file_url: string;
    script: string;
    duration_seconds: number;
    language: string;
    lesson_type: string;
}

interface IVRCall {
    id: number;
    phone_number: string;
    call_status: string;
    call_duration_seconds: number;
    initiated_at: string;
    ivr_lessons?: {
        lesson_title: string;
    };
}

const IVRLessonRecorder: React.FC = () => {
    const { currentSchool } = useAuth();
    const [lessons, setLessons] = useState<IVRLesson[]>([]);
    const [calls, setCalls] = useState<IVRCall[]>([]);
    const [activeTab, setActiveTab] = useState<'create' | 'calls' | 'analytics'>('create');

    // Form states
    const [lessonTitle, setLessonTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [script, setScript] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [duration, setDuration] = useState('');
    const [language, setLanguage] = useState('English');
    const [lessonType, setLessonType] = useState('Educational');

    const [loading, setLoading] = useState(true);
    const [totalCalls, setTotalCalls] = useState(0);
    const [completedCalls, setCompletedCalls] = useState(0);
    const [avgDuration, setAvgDuration] = useState(0);

    useEffect(() => {
        if (!currentSchool) return;
        fetchLessons();
        fetchCalls();
        fetchStats();
    }, [currentSchool]);

    const fetchLessons = async () => {
        if (!currentSchool) return;
        try {
            const { data, error } = await supabase
                .from('ivr_lessons')
                .select('*')
                .eq('school_id', currentSchool.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLessons(data || []);
        } catch (error: any) {
            console.error('Error fetching lessons:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCalls = async () => {
        if (!currentSchool) return;
        try {
            const { data, error } = await supabase
                .from('ivr_calls')
                .select(`
          *,
          ivr_lessons!inner (lesson_title, school_id)
        `)
                .eq('ivr_lessons.school_id', currentSchool.id)
                .order('initiated_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setCalls(data || []);
        } catch (error: any) {
            console.error('Error fetching calls:', error);
        }
    };

    const fetchStats = async () => {
        if (!currentSchool) return;
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Fetch lesson IDs for the current school first
            const { data: schoolLessons } = await supabase
                .from('ivr_lessons')
                .select('id')
                .eq('school_id', currentSchool.id);

            const lessonIds = schoolLessons?.map(l => l.id) || [];

            if (lessonIds.length === 0) {
                setTotalCalls(0);
                setCompletedCalls(0);
                setAvgDuration(0);
                return;
            }

            // Total calls
            const { count: total } = await supabase
                .from('ivr_calls')
                .select('*', { count: 'exact', head: true })
                .in('lesson_id', lessonIds)
                .gte('initiated_at', thirtyDaysAgo.toISOString());

            setTotalCalls(total || 0);

            // Completed calls
            const { count: completed } = await supabase
                .from('ivr_calls')
                .select('*', { count: 'exact', head: true })
                .eq('call_status', 'Completed')
                .in('lesson_id', lessonIds)
                .gte('initiated_at', thirtyDaysAgo.toISOString());

            setCompletedCalls(completed || 0);

            // Average duration
            const { data: durData } = await supabase
                .from('ivr_calls')
                .select('call_duration_seconds')
                .eq('call_status', 'Completed')
                .in('lesson_id', lessonIds)
                .gte('initiated_at', thirtyDaysAgo.toISOString());

            if (durData && durData.length > 0) {
                const avg = durData.reduce((sum, call) => sum + (call.call_duration_seconds || 0), 0) / durData.length;
                setAvgDuration(Math.round(avg));
            }
        } catch (error: any) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleCreateLesson = async () => {
        if (!currentSchool) return;
        if (!lessonTitle || !audioUrl || !script) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('ivr_lessons')
                .insert({
                    school_id: currentSchool.id,
                    lesson_title: lessonTitle,
                    subject,
                    grade,
                    audio_file_url: audioUrl,
                    script,
                    duration_seconds: Number(duration) || 0,
                    language,
                    lesson_type: lessonType
                });

            if (error) throw error;

            toast.success('IVR Lesson created! 📞');
            resetForm();
            fetchLessons();
        } catch (error: any) {
            toast.error('Failed to create lesson');
            console.error(error);
        }
    };

    const resetForm = () => {
        setLessonTitle('');
        setSubject('');
        setGrade('');
        setScript('');
        setAudioUrl('');
        setDuration('');
        setLanguage('English');
        setLessonType('Educational');
    };

    const getCallStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Completed: 'bg-green-100 text-green-800',
            InProgress: 'bg-blue-100 text-blue-800',
            Failed: 'bg-red-100 text-red-800',
            Busy: 'bg-yellow-100 text-yellow-800',
            NoAnswer: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const completionRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(0) : 0;

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">📞 IVR Lesson Recorder</h1>
                <p className="text-orange-100">Voice lessons for remote & illiterate parents</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <PhoneCall className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
                            <p className="text-sm text-gray-600">Total Calls (30d)</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                            <p className="text-sm text-gray-600">Completion Rate</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Phone className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{Math.floor(avgDuration / 60)}m {avgDuration % 60}s</p>
                            <p className="text-sm text-gray-600">Avg Duration</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'create'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Create Lesson
                </button>
                <button
                    onClick={() => setActiveTab('calls')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'calls'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Call History ({calls.length})
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'analytics'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Lesson Library ({lessons.length})
                </button>
            </div>

            {/* Create Lesson Tab */}
            {activeTab === 'create' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Voice Lesson</h2>

                    <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-800">
                            <strong>IVR (Interactive Voice Response)</strong> allows parents to call a phone number and listen to lessons in their local language. Perfect for remote areas and illiterate parents who can't use smartphones.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lesson Title *</label>
                            <input
                                type="text"
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                placeholder="e.g., Welcome to School - Yoruba"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lesson Type</label>
                            <select
                                value={lessonType}
                                onChange={(e) => setLessonType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                                <option>Educational</option>
                                <option>Announcement</option>
                                <option>Survey</option>
                                <option>Reminder</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g., Parent Orientation"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Grade (if applicable)</label>
                            <input
                                type="text"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                placeholder="e.g., All Grades"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (seconds)</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder="120"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Language *</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                                <option>English</option>
                                <option>Yoruba</option>
                                <option>Igbo</option>
                                <option>Hausa</option>
                                <option>Pidgin</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lesson Script *</label>
                            <textarea
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                placeholder="Type the text version of your voice lesson here..."
                                rows={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1">💡 This text will be used for reference and accessibility</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Audio File URL *</label>
                            <div className="flex space-x-2">
                                <input
                                    type="url"
                                    value={audioUrl}
                                    onChange={(e) => setAudioUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">
                                    <Upload className="h-5 w-5 inline mr-2" />
                                    Upload Audio
                                </button>
                                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold">
                                    <Mic className="h-5 w-5 inline mr-2" />
                                    Record
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Upload MP3/WAV audio file or record directly</p>
                        </div>
                    </div>

                    <button
                        onClick={handleCreateLesson}
                        className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold transition-colors"
                    >
                        Create IVR Lesson
                    </button>
                </div>
            )}

            {/* Calls Tab */}
            {activeTab === 'calls' && (
                <div className="space-y-4">
                    {calls.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No IVR calls yet</p>
                            <p className="text-sm">Calls will appear once parents dial the IVR number</p>
                        </div>
                    ) : (
                        calls.map(call => (
                            <div key={call.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{call.ivr_lessons?.lesson_title || 'Unknown Lesson'}</h3>
                                        <p className="text-sm text-gray-600">{call.phone_number}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCallStatusColor(call.call_status)}`}>
                                        {call.call_status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Initiated</p>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(call.initiated_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Duration</p>
                                        <p className="font-semibold text-gray-900">
                                            {call.call_duration_seconds
                                                ? `${Math.floor(call.call_duration_seconds / 60)}m ${call.call_duration_seconds % 60}s`
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Status</p>
                                        <p className="font-semibold text-gray-900">{call.call_status}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Lesson Library Tab */}
            {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lessons.length === 0 ? (
                        <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Mic className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No IVR lessons created yet</p>
                            <p className="text-sm">Create your first voice lesson to get started</p>
                        </div>
                    ) : (
                        lessons.map(lesson => (
                            <div key={lesson.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900">{lesson.lesson_title}</h3>
                                    <div className="flex items-center space-x-2">
                                        <button className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200">
                                            <Play className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lesson.script}</p>

                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-semibold">{lesson.language}</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">{lesson.lesson_type}</span>
                                    <span>{Math.floor(lesson.duration_seconds / 60)}m {lesson.duration_seconds % 60}s</span>
                                </div>

                                {lesson.subject && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Subject: {lesson.subject} {lesson.grade && `• ${lesson.grade}`}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default IVRLessonRecorder;
