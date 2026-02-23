
import React, { useState, useEffect } from 'react';
import { UsersIcon, ParentNavIcon, TeacherNavIcon, StudentNavIcon, AIIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { getAIClient, AI_MODEL_NAME, SchemaType as Type } from '../../lib/ai';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Audience = 'all' | 'parents' | 'teachers' | 'students';

const AudienceCard: React.FC<{ icon: React.ReactNode, label: string, count?: number, id: Audience, selected: boolean, onSelect: () => void }> = ({ icon, label, count, id, selected, onSelect }) => {
    const baseStyle = "w-full p-4 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200";
    const selectedStyle = "ring-2 ring-sky-500 border-sky-500 scale-105";
    const hoverStyle = "hover:shadow-md hover:scale-105";

    return (
        <button onClick={onSelect} className={`${baseStyle} ${selected ? selectedStyle : 'border-transparent'} ${hoverStyle}`} aria-pressed={selected}>
            <div className={`mb-2 ${selected ? 'text-sky-500' : 'text-gray-500'}`}>{icon}</div>
            <span className={`font-semibold ${selected ? 'text-sky-600' : 'text-gray-700'}`}>{label}</span>
            {count !== undefined && <span className="text-xs text-gray-500 mt-1">{count} recipients</span>}
        </button>
    );
};


const CommunicationHub: React.FC = () => {
    const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [stats, setStats] = useState<{ parents: number, teachers: number, students: number }>({ parents: 0, teachers: 0, students: 0 });
    const [notices, setNotices] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { user, currentSchool, currentBranchId } = useAuth();

    useEffect(() => {
        const loadCounts = async () => {
            if (!currentSchool?.id) return;
            try {
                // We'll use a raw query to get counts for the dashboard-like experience
                const { data: profiles, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('school_id', currentSchool.id);

                if (error) throw error;

                const counts = {
                    parents: profiles.filter(p => p.role === 'parent').length,
                    teachers: profiles.filter(p => p.role === 'teacher').length,
                    students: profiles.filter(p => p.role === 'student').length,
                };
                setStats(counts);
            } catch (err) {
                console.error("Error loading recipient counts:", err);
            }
        };

        const loadNotices = async () => {
            if (!currentSchool?.id) return;
            try {
                const data = await api.getNotices(currentSchool.id);
                setNotices(data);
            } catch (err) {
                console.error("Error loading notices:", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadCounts();
        loadNotices();
    }, [currentSchool?.id]);


    const audiences: { id: Audience, label: string, icon: React.ReactNode }[] = [
        { id: 'all', label: 'Everyone', icon: <UsersIcon className="h-8 w-8" /> },
        { id: 'parents', label: 'Parents', icon: <ParentNavIcon className="h-8 w-8" /> },
        { id: 'teachers', label: 'Teachers', icon: <TeacherNavIcon className="h-8 w-8" /> },
        { id: 'students', label: 'Students', icon: <StudentNavIcon className="h-8 w-8" /> },
    ];

    const handleGenerate = async () => {
        if (!aiPrompt) return;
        if (!selectedAudience) {
            toast.error("Please select an audience first to generate a tailored announcement.");
            return;
        }
        setIsGenerating(true);
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const audienceText = selectedAudience === 'all' ? 'everyone (students, parents, and teachers)' : `the ${selectedAudience}`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `Generate a school announcement targeted at ${audienceText}. The topic is: "${aiPrompt}". The tone should be appropriate for the selected audience.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: 'A concise and informative title for the announcement.' },
                            message: { type: Type.STRING, description: 'The full message body of the announcement, written in a clear, friendly, and professional tone. Use newline characters for paragraphs.' }
                        },
                        propertyOrdering: ["title", "message"]
                    },
                }
            });
            const jsonResponse = JSON.parse(response.text.trim());
            setTitle(jsonResponse.title || '');
            setMessage(jsonResponse.message || '');
            setShowAiPrompt(false);
            setAiPrompt('');
        } catch (error) {
            console.error("AI Generation Error:", error);
            toast.error("Failed to generate announcement. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSend = async () => {
        if (!selectedAudience || !title || !message) {
            toast.error('Please select an audience, and fill in the title and message.');
            return;
        }

        if (!currentSchool?.id || !user?.id) {
            toast.error('Authentication error. Please try logging in again.');
            return;
        }

        setIsSending(true);
        try {
            const audienceList = selectedAudience === 'all' ? ['all'] : [selectedAudience];

            // 1. Create the persistent Notice
            await api.createNotice({
                school_id: currentSchool.id,
                branch_id: currentBranchId, // Pass the active branch ID
                title,
                content: message,
                audience: audienceList as string[],
                created_by: user.id,
                category: 'General',
                is_pinned: false,
                timestamp: new Date().toISOString()
            });

            // 2. Create the Real-time Notification Alert
            // This ensures users see the red badge and get a toast immediately via existing hooks
            try {
                await api.createNotification({
                    school_id: currentSchool.id,
                    user_id: null, // Broadcast notification (null targets audience)
                    audience: audienceList,
                    title: `New Announcement: ${title}`,
                    message: message.substring(0, 150) + (message.length > 150 ? '...' : ''), // Preview
                    category: 'Alert',
                    is_read: false,
                    created_at: new Date().toISOString()
                });
            } catch (notificationError) {
                console.error('Failed to create notification alert:', notificationError);
                // We don't block the UI success for this, as the main notice was saved.
            }

            toast.success(`Announcement sent to ${selectedAudience}`);

            // Refresh notices history
            if (currentSchool?.id) {
                const refreshed = await api.getNotices(currentSchool.id);
                setNotices(refreshed);
            }

            // Reset form
            setSelectedAudience(null);
            setTitle('');
            setMessage('');
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-5 overflow-y-auto">
                {/* Audience Selection */}
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">1. Select Audience</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {audiences.map(audience => (
                            <AudienceCard
                                key={audience.id}
                                id={audience.id}
                                icon={audience.icon}
                                label={audience.label}
                                count={audience.id === 'all' ? (stats.parents + stats.teachers + stats.students) : stats[audience.id as keyof typeof stats]}
                                selected={selectedAudience === audience.id}
                                onSelect={() => setSelectedAudience(audience.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Message Composition */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-gray-800">2. Compose Message</h3>
                        <button
                            type="button"
                            onClick={() => setShowAiPrompt(!showAiPrompt)}
                            className="flex items-center space-x-2 px-3 py-1 text-sm font-semibold text-sky-600 bg-sky-100 rounded-full hover:bg-sky-200 transition-colors"
                        >
                            <AIIcon className="h-4 w-4" />
                            <span>Generate with AI</span>
                        </button>
                    </div>
                    {showAiPrompt && (
                        <div className="bg-white p-3 rounded-xl shadow-sm mb-4 border border-sky-200 space-y-2">
                            <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Announce the mid-term break dates" className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" disabled={isGenerating} />
                            <button onClick={handleGenerate} disabled={isGenerating || !aiPrompt} className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:bg-gray-400">
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    )}
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full px-4 py-2 text-gray-800 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 font-semibold" />
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Type your announcement here..." className="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                </div>

                {/* Recent Announcements */}
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Recent Announcements</h3>
                    {isLoadingData ? (
                        <div className="bg-white p-8 rounded-xl shadow-sm flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                        </div>
                    ) : notices.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500 italic">
                            No announcements sent yet.
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                            {notices.map((notice) => (
                                <div key={notice.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-gray-900">{notice.title}</h4>
                                        <span className="text-xs text-gray-400">
                                            {new Date(notice.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{notice.content}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-1">
                                            {notice.audience?.map((aud: string) => (
                                                <span key={aud} className="px-2 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-500 rounded uppercase">
                                                    {aud}
                                                </span>
                                            ))}
                                        </div>
                                        <button className="text-xs font-semibold text-sky-600 hover:text-sky-700">View Details</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <div className="p-4 mt-auto bg-white border-t border-gray-200">
                <button
                    onClick={handleSend}
                    disabled={isSending || !selectedAudience || !title || !message}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-gray-400"
                >
                    {isSending ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default CommunicationHub;
