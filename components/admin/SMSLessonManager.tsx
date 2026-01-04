import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MessageSquare, Send, Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SMSLesson {
    id: number;
    lesson_title: string;
    subject: string;
    grade: string;
    content: string;
    lesson_type: string;
    language: string;
    is_active: boolean;
}

interface SMSSchedule {
    id: number;
    lesson_id: number;
    scheduled_date: string;
    scheduled_time: string;
    target_audience: string;
    status: string;
    recipients_count: number;
    delivered_count: number;
    failed_count: number;
    cost_naira: number;
    sms_lessons?: {
        lesson_title: string;
        content: string;
    };
}

const SMSLessonManager: React.FC = () => {
    const [lessons, setLessons] = useState<SMSLesson[]>([]);
    const [schedules, setSchedules] = useState<SMSSchedule[]>([]);
    const [activeTab, setActiveTab] = useState<'create' | 'schedule' | 'history'>('create');

    // Form states
    const [lessonTitle, setLessonTitle] = useState('');
    const [subject, setSubject] = useState('Mathematics');
    const [grade, setGrade] = useState('');
    const [content, setContent] = useState('');
    const [lessonType, setLessonType] = useState('Educational');
    const [language, setLanguage] = useState('English');

    // Schedule states
    const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('09:00');
    const [targetAudience, setTargetAudience] = useState('All Parents');

    const [loading, setLoading] = useState(true);

    const MAX_SMS_LENGTH = 160;

    useEffect(() => {
        fetchLessons();
        fetchSchedules();
    }, []);

    const fetchLessons = async () => {
        try {
            const { data, error } = await supabase
                .from('sms_lessons')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLessons(data || []);
        } catch (error: any) {
            console.error('Error fetching lessons:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const { data, error } = await supabase
                .from('sms_schedules')
                .select(`
          *,
          sms_lessons (lesson_title, content)
        `)
                .order('scheduled_date', { ascending: false })
                .order('scheduled_time', { ascending: false });

            if (error) throw error;
            setSchedules(data || []);
        } catch (error: any) {
            console.error('Error fetching schedules:', error);
        }
    };

    const handleCreateLesson = async () => {
        if (!lessonTitle || !content) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (content.length > MAX_SMS_LENGTH) {
            toast.error(`Content exceeds ${MAX_SMS_LENGTH} characters`);
            return;
        }

        try {
            const { error } = await supabase
                .from('sms_lessons')
                .insert({
                    lesson_title: lessonTitle,
                    subject,
                    grade,
                    content,
                    lesson_type: lessonType,
                    language,
                    is_active: true
                });

            if (error) throw error;

            toast.success('SMS Lesson created! 📱');
            resetForm();
            fetchLessons();
        } catch (error: any) {
            toast.error('Failed to create lesson');
            console.error(error);
        }
    };

    const handleScheduleSMS = async () => {
        if (!selectedLessonId || !scheduleDate || !scheduleTime) {
            toast.error('Please select a lesson and set date/time');
            return;
        }

        try {
            // Get recipient count
            const { count } = await supabase
                .from('sms_contacts')
                .select('*', { count: 'exact', head: true })
                .eq('opt_in', true);

            const recipientCount = count || 0;
            const estimatedCost = recipientCount * 2.5; // ₦2.50 per SMS

            const { error } = await supabase
                .from('sms_schedules')
                .insert({
                    lesson_id: selectedLessonId,
                    scheduled_date: scheduleDate,
                    scheduled_time: scheduleTime,
                    target_audience: targetAudience,
                    status: 'Scheduled',
                    recipients_count: recipientCount,
                    cost_naira: estimatedCost
                });

            if (error) throw error;

            toast.success(`SMS scheduled for ${recipientCount} recipients! 📅`);
            setSelectedLessonId(null);
            setScheduleDate('');
            fetchSchedules();
        } catch (error: any) {
            toast.error('Failed to schedule SMS');
            console.error(error);
        }
    };

    const resetForm = () => {
        setLessonTitle('');
        setSubject('Mathematics');
        setGrade('');
        setContent('');
        setLessonType('Educational');
        setLanguage('English');
    };

    const getStatusBadge = (status: string) => {
        const colors: { [key: string]: string } = {
            Scheduled: 'bg-blue-100 text-blue-800',
            Sending: 'bg-yellow-100 text-yellow-800',
            Sent: 'bg-green-100 text-green-800',
            Failed: 'bg-red-100 text-red-800',
            Cancelled: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getDeliveryRate = (schedule: SMSSchedule) => {
        if (schedule.recipients_count === 0) return 0;
        return ((schedule.delivered_count / schedule.recipients_count) * 100).toFixed(0);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">📱 SMS Lesson Manager</h1>
                <p className="text-green-100">Reach parents via SMS - works on all phones</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'create'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Create Lesson
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'schedule'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Schedule SMS
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'history'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    History ({schedules.length})
                </button>
            </div>

            {/* Create Lesson Tab */}
            {activeTab === 'create' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Create SMS Lesson</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lesson Title *</label>
                            <input
                                type="text"
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                placeholder="e.g., Math Tip of the Day"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option>Mathematics</option>
                                <option>English</option>
                                <option>Science</option>
                                <option>Social Studies</option>
                                <option>General</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                            <input
                                type="text"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                placeholder="e.g., JSS1, SS2"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lesson Type</label>
                            <select
                                value={lessonType}
                                onChange={(e) => setLessonType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option>Educational</option>
                                <option>Reminder</option>
                                <option>Announcement</option>
                                <option>Quiz</option>
                                <option>Tip</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option>English</option>
                                <option>Yoruba</option>
                                <option>Igbo</option>
                                <option>Hausa</option>
                                <option>Pidgin</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-700">Content (SMS Text) *</label>
                            <span className={`text-sm font-semibold ${content.length > MAX_SMS_LENGTH ? 'text-red-600' : 'text-gray-600'}`}>
                                {content.length} / {MAX_SMS_LENGTH}
                            </span>
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter message (160 characters max)..."
                            rows={4}
                            maxLength={MAX_SMS_LENGTH}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1">💡 Tip: Keep it concise - SMS has a 160-character limit</p>
                    </div>

                    <button
                        onClick={handleCreateLesson}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-colors"
                    >
                        Create Lesson
                    </button>

                    {/* Recent Lessons */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Lessons ({lessons.length})</h3>
                        <div className="space-y-2">
                            {lessons.slice(0, 5).map(lesson => (
                                <div key={lesson.id} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-gray-900">{lesson.lesson_title}</h4>
                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                            {lesson.lesson_type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{lesson.content}</p>
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <span>{lesson.subject}</span>
                                        <span>•</span>
                                        <span>{lesson.language}</span>
                                        <span>•</span>
                                        <span>{lesson.content.length} chars</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule SMS Tab */}
            {activeTab === 'schedule' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule SMS Broadcast</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Lesson *</label>
                        <select
                            value={selectedLessonId || ''}
                            onChange={(e) => setSelectedLessonId(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                            <option value="">-- Select a lesson --</option>
                            {lessons.map(lesson => (
                                <option key={lesson.id} value={lesson.id}>
                                    {lesson.lesson_title} ({lesson.content.length} chars)
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedLessonId && (
                        <div className="p-4 bg-blue-50 rounded-lg mb-6">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Preview:</p>
                            <p className="text-gray-900">{lessons.find(l => l.id === selectedLessonId)?.content}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                            <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Time *</label>
                            <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience</label>
                            <select
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option>All Parents</option>
                                <option>Specific Class</option>
                                <option>Teachers</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleScheduleSMS}
                        disabled={!selectedLessonId}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold transition-colors"
                    >
                        <Send className="h-5 w-5 inline mr-2" />
                        Schedule SMS
                    </button>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {schedules.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No SMS broadcasts scheduled</p>
                        </div>
                    ) : (
                        schedules.map(schedule => (
                            <div key={schedule.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{schedule.sms_lessons?.lesson_title}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{schedule.sms_lessons?.content}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(schedule.status)}`}>
                                        {schedule.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Scheduled</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(schedule.scheduled_date).toLocaleDateString()} {schedule.scheduled_time}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Recipients</p>
                                        <p className="text-sm font-semibold text-gray-900">{schedule.recipients_count}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Delivered</p>
                                        <p className="text-sm font-semibold text-green-600">
                                            {schedule.delivered_count} ({getDeliveryRate(schedule)}%)
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Cost</p>
                                        <p className="text-sm font-semibold text-gray-900">₦{schedule.cost_naira?.toFixed(2) || '0.00'}</p>
                                    </div>
                                </div>

                                {schedule.failed_count > 0 && (
                                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                                        ⚠️ {schedule.failed_count} messages failed to deliver
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

export default SMSLessonManager;
