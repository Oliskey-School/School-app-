import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Radio, Upload, Calendar, Volume2, MapPin, Users } from 'lucide-react';

interface RadioContent {
    id: number;
    content_title: string;
    description: string;
    subject: string;
    grade: string;
    audio_file_url: string;
    duration_minutes: number;
    language: string;
    content_type: string;
}

interface RadioBroadcast {
    id: number;
    broadcast_date: string;
    broadcast_time: string;
    frequency: string;
    estimated_listeners: number;
    status: string;
    radio_content?: {
        content_title: string;
        duration_minutes: number;
    };
    radio_partners?: {
        station_name: string;
        location: string;
    };
}

interface RadioPartner {
    id: number;
    station_name: string;
    location: string;
    frequency: string;
    coverage_area: string;
    contact_person: string;
    contact_phone: string;
    partnership_status: string;
}

const RadioContentScheduler: React.FC = () => {
    const [content, setContent] = useState<RadioContent[]>([]);
    const [broadcasts, setBroadcasts] = useState<RadioBroadcast[]>([]);
    const [partners, setPartners] = useState<RadioPartner[]>([]);
    const [activeTab, setActiveTab] = useState<'content' | 'schedule' | 'partners'>('content');

    // Form states
    const [contentTitle, setContentTitle] = useState('');
    const [description, setDescription] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [duration, setDuration] = useState('');
    const [language, setLanguage] = useState('English');
    const [contentType, setContentType] = useState('Lesson');

    // Broadcast form
    const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
    const [broadcastDate, setBroadcastDate] = useState('');
    const [broadcastTime, setBroadcastTime] = useState('');
    const [estimatedListeners, setEstimatedListeners] = useState('');

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContent();
        fetchBroadcasts();
        fetchPartners();
    }, []);

    const fetchContent = async () => {
        try {
            const { data, error } = await supabase
                .from('radio_content')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching content:', error);
                setContent([]);
                setLoading(false);
                return;
            }
            setContent(data || []);
        } catch (error: any) {
            console.error('Error fetching content:', error);
            setContent([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchBroadcasts = async () => {
        try {
            const { data, error } = await supabase
                .from('radio_broadcasts')
                .select(`
          *,
          radio_content (content_title, duration_minutes),
          radio_partners (station_name, location)
        `)
                .order('broadcast_date', { ascending: false })
                .order('broadcast_time', { ascending: false });

            if (error) {
                console.error('Error fetching broadcasts:', error);
                setBroadcasts([]);
                return;
            }
            setBroadcasts(data || []);
        } catch (error: any) {
            console.error('Error fetching broadcasts:', error);
            setBroadcasts([]);
        }
    };

    const fetchPartners = async () => {
        try {
            const { data, error } = await supabase
                .from('radio_partners')
                .select('*')
                .eq('partnership_status', 'Active')
                .order('station_name', { ascending: true });

            if (error) {
                console.error('Error fetching partners:', error);
                setPartners([]);
                return;
            }
            setPartners(data || []);
        } catch (error: any) {
            console.error('Error fetching partners:', error);
            setPartners([]);
        }
    };

    const handleCreateContent = async () => {
        if (!contentTitle || !audioUrl) {
            toast.error('Please provide title and audio URL');
            return;
        }

        try {
            const { error } = await supabase
                .from('radio_content')
                .insert({
                    content_title: contentTitle,
                    description,
                    subject,
                    grade,
                    audio_file_url: audioUrl,
                    duration_minutes: Number(duration) || 0,
                    language,
                    content_type: contentType
                });

            if (error) throw error;

            toast.success('Radio content created! 📻');
            resetContentForm();
            fetchContent();
        } catch (error: any) {
            toast.error('Failed to create content');
            console.error(error);
        }
    };

    const handleScheduleBroadcast = async () => {
        if (!selectedContentId || !selectedPartnerId || !broadcastDate || !broadcastTime) {
            toast.error('Please fill in all broadcast details');
            return;
        }

        try {
            const partner = partners.find(p => p.id === selectedPartnerId);

            const { error } = await supabase
                .from('radio_broadcasts')
                .insert({
                    content_id: selectedContentId,
                    radio_partner_id: selectedPartnerId,
                    broadcast_date: broadcastDate,
                    broadcast_time: broadcastTime,
                    frequency: partner?.frequency || '',
                    estimated_listeners: Number(estimatedListeners) || 0,
                    status: 'Scheduled'
                });

            if (error) throw error;

            toast.success('Broadcast scheduled! 📅');
            resetBroadcastForm();
            fetchBroadcasts();
        } catch (error: any) {
            toast.error('Failed to schedule broadcast');
            console.error(error);
        }
    };

    const resetContentForm = () => {
        setContentTitle('');
        setDescription('');
        setSubject('');
        setGrade('');
        setAudioUrl('');
        setDuration('');
        setLanguage('English');
        setContentType('Lesson');
    };

    const resetBroadcastForm = () => {
        setSelectedContentId(null);
        setSelectedPartnerId(null);
        setBroadcastDate('');
        setBroadcastTime('');
        setEstimatedListeners('');
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Scheduled: 'bg-blue-100 text-blue-800',
            Aired: 'bg-green-100 text-green-800',
            Cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">📻 Radio Content Scheduler</h1>
                <p className="text-purple-100">Reach remote areas via community radio</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'content'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Content Library ({content.length})
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'schedule'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Broadcasts ({broadcasts.length})
                </button>
                <button
                    onClick={() => setActiveTab('partners')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'partners'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Radio Partners ({partners.length})
                </button>
            </div>

            {/* Content Tab */}
            {activeTab === 'content' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Radio Content</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Content Title *</label>
                                <input
                                    type="text"
                                    value={contentTitle}
                                    onChange={(e) => setContentTitle(e.target.value)}
                                    placeholder="e.g., Mathematics Lesson - Fractions"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Content Type</label>
                                <select
                                    value={contentType}
                                    onChange={(e) => setContentType(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option>Lesson</option>
                                    <option>Story</option>
                                    <option>Announcement</option>
                                    <option>Music</option>
                                    <option>Interview</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g., Mathematics"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                                <input
                                    type="text"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    placeholder="e.g., Primary 4"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder="15"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option>English</option>
                                    <option>Yoruba</option>
                                    <option>Igbo</option>
                                    <option>Hausa</option>
                                    <option>Pidgin</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of the content..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                ></textarea>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Audio File URL *</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="url"
                                        value={audioUrl}
                                        onChange={(e) => setAudioUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">
                                        <Upload className="h-5 w-5 inline mr-2" />
                                        Upload
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">💡 Upload audio file (MP3, WAV) to cloud storage and paste URL</p>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateContent}
                            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold transition-colors"
                        >
                            Add to Content Library
                        </button>
                    </div>

                    {/* Content List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {content.map(item => (
                            <div key={item.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900">{item.content_title}</h3>
                                    <Volume2 className="h-5 w-5 text-purple-600" />
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-semibold">{item.content_type}</span>
                                    <span>{item.duration_minutes} min</span>
                                    <span>{item.language}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule Broadcast</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Content *</label>
                                <select
                                    value={selectedContentId || ''}
                                    onChange={(e) => setSelectedContentId(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- Select content --</option>
                                    {content.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.content_title} ({item.duration_minutes} min)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Radio Partner *</label>
                                <select
                                    value={selectedPartnerId || ''}
                                    onChange={(e) => setSelectedPartnerId(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- Select radio station --</option>
                                    {partners.map(partner => (
                                        <option key={partner.id} value={partner.id}>
                                            {partner.station_name} - {partner.frequency} ({partner.location})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Broadcast Date *</label>
                                <input
                                    type="date"
                                    value={broadcastDate}
                                    onChange={(e) => setBroadcastDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Broadcast Time *</label>
                                <input
                                    type="time"
                                    value={broadcastTime}
                                    onChange={(e) => setBroadcastTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Listeners</label>
                                <input
                                    type="number"
                                    value={estimatedListeners}
                                    onChange={(e) => setEstimatedListeners(e.target.value)}
                                    placeholder="e.g., 5000"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleScheduleBroadcast}
                            disabled={!selectedContentId || !selectedPartnerId}
                            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold transition-colors"
                        >
                            Schedule Broadcast
                        </button>
                    </div>

                    {/* Broadcasts List */}
                    <div className="space-y-4">
                        {broadcasts.map(broadcast => (
                            <div key={broadcast.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{broadcast.radio_content?.content_title}</h3>
                                        <p className="text-sm text-gray-600">{broadcast.radio_partners?.station_name} - {broadcast.radio_partners?.location}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(broadcast.status)}`}>
                                        {broadcast.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Date</p>
                                        <p className="font-semibold text-gray-900">{new Date(broadcast.broadcast_date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Time</p>
                                        <p className="font-semibold text-gray-900">{broadcast.broadcast_time}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Frequency</p>
                                        <p className="font-semibold text-gray-900">{broadcast.frequency}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Est. Listeners</p>
                                        <p className="font-semibold text-gray-900">{broadcast.estimated_listeners?.toLocaleString() || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Partners Tab */}
            {activeTab === 'partners' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {partners.map(partner => (
                        <div key={partner.id} className="bg-white rounded-xl shadow-sm p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{partner.station_name}</h3>
                                    <p className="text-sm text-gray-600">{partner.frequency}</p>
                                </div>
                                <Radio className="h-6 w-6 text-purple-600" />
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    <span>{partner.location}</span>
                                </div>
                                <div>
                                    <p className="text-gray-500">Coverage Area</p>
                                    <p className="text-gray-900">{partner.coverage_area}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Contact</p>
                                    <p className="text-gray-900">{partner.contact_person} - {partner.contact_phone}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RadioContentScheduler;
