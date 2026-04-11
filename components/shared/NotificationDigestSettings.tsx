import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    Bell,
    Clock,
    Mail,
    MessageSquare,
    Smartphone,
    Volume2,
    VolumeX,
    AlertTriangle,
    BookOpen,
    CreditCard,
    Calendar,
    Users,
    Save,
    CheckCircle2,
    Info,
    Loader2
} from 'lucide-react';

interface NotificationCategory {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    mode: 'instant' | 'digest' | 'off';
    channel: 'push' | 'sms' | 'whatsapp' | 'email';
}

const NotificationDigestSettings = () => {
    const { user } = useAuth();
    const [digestTime, setDigestTime] = useState('19:00');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState<NotificationCategory[]>([
        { id: 'homework', label: 'Homework & Assignments', icon: <BookOpen className="w-5 h-5" />, description: 'New assignments, submission reminders, grades.', mode: 'digest', channel: 'push' },
        { id: 'fees', label: 'Fee Reminders', icon: <CreditCard className="w-5 h-5" />, description: 'Payment due dates, receipts, balance updates.', mode: 'instant', channel: 'whatsapp' },
        { id: 'attendance', label: 'Attendance', icon: <CheckCircle2 className="w-5 h-5" />, description: 'Daily attendance status, late arrival alerts.', mode: 'instant', channel: 'push' },
        { id: 'emergency', label: 'Emergency Alerts', icon: <AlertTriangle className="w-5 h-5" />, description: 'School emergencies, safety alerts, closures.', mode: 'instant', channel: 'sms' },
        { id: 'events', label: 'Events & Calendar', icon: <Calendar className="w-5 h-5" />, description: 'School events, PTA meetings, holidays.', mode: 'digest', channel: 'push' },
        { id: 'behavior', label: 'Behavior Reports', icon: <Users className="w-5 h-5" />, description: 'Behavior logs, merits, demerits.', mode: 'instant', channel: 'push' },
        { id: 'general', label: 'General Announcements', icon: <Bell className="w-5 h-5" />, description: 'School-wide announcements and updates.', mode: 'digest', channel: 'push' },
    ]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const settings = await api.getNotificationSettings();
            if (settings) {
                setDigestTime(settings.digest_time || '19:00');
                if (settings.categories) {
                    setCategories(prev => prev.map(c => {
                        const loaded = (settings.categories as any[]).find(l => l.id === c.id);
                        return loaded ? { ...c, mode: loaded.mode, channel: loaded.channel } : c;
                    }));
                }
            }
        } catch (err) {
            console.error('Fetch settings error:', err);
            // toast.error('Failed to load preferences');
        } finally {
            setLoading(false);
        }
    };

    const updateCategory = (id: string, field: 'mode' | 'channel', value: string) => {
        if (id === 'emergency' && field === 'mode' && value !== 'instant') {
            toast.error('Emergency alerts must always be instant!');
            return;
        }
        setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateNotificationSettings({
                digest_time: digestTime,
                categories: categories.map(c => ({ id: c.id, mode: c.mode, channel: c.channel }))
            });
            toast.success('Notification preferences saved!');
        } catch (err) {
            toast.error('Failed to save preferences');
        } finally {
            setIsSaving(false);
        }
    };

    const modes = [
        { value: 'instant', label: 'Instant', icon: <Volume2 className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        { value: 'digest', label: 'Digest', icon: <Clock className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
        { value: 'off', label: 'Off', icon: <VolumeX className="w-4 h-4" />, color: 'bg-gray-100 text-gray-500 border-gray-200' },
    ];

    const channels = [
        { value: 'push', label: 'Push', icon: <Smartphone className="w-4 h-4" /> },
        { value: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
        { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" /> },
        { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    ];

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4 font-outfit">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-gray-500 font-bold">Loading your preferences...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 font-outfit">Notification Preferences</h1>
                <p className="text-gray-500 text-sm mt-1">Control how and when you receive notifications.</p>
            </header>

            {/* Digest Time */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Clock className="w-6 h-6" /></div>
                        <div>
                            <h3 className="font-bold text-gray-800">Daily Digest Time</h3>
                            <p className="text-xs text-gray-500">When digest-mode notifications are batched and sent.</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <input type="time" value={digestTime} onChange={e => setDigestTime(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>
            </div>

            {/* Emergency Warning */}
            <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700"><strong>Emergency alerts</strong> always arrive instantly via all channels and cannot be muted or delayed.</p>
            </div>

            {/* Categories */}
            <div className="space-y-4">
                {categories.map(cat => (
                    <div key={cat.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${cat.id === 'emergency' ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                        <div className="flex items-start space-x-4">
                            <div className="p-2 rounded-xl bg-gray-50 text-gray-600 mt-1">{cat.icon}</div>
                            <div className="flex-grow">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-bold text-gray-800">{cat.label}</h3>
                                    {cat.id === 'emergency' && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Always Instant</span>}
                                </div>
                                <p className="text-xs text-gray-500 mb-3">{cat.description}</p>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    {/* Mode Selector */}
                                    <div className="flex p-0.5 bg-gray-100 rounded-lg">
                                        {modes.map(m => (
                                            <button key={m.value} onClick={() => updateCategory(cat.id, 'mode', m.value)}
                                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${cat.mode === m.value ? `${m.color} border` : 'text-gray-400'}`}>
                                                {m.icon}<span>{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {/* Channel Selector */}
                                    {cat.mode !== 'off' && (
                                        <div className="flex p-0.5 bg-gray-100 rounded-lg">
                                            {channels.map(ch => (
                                                <button key={ch.value} onClick={() => updateCategory(cat.id, 'channel', ch.value)}
                                                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${cat.channel === ch.value ? 'bg-white shadow-sm text-indigo-600 border border-indigo-200' : 'text-gray-400'}`}>
                                                    {ch.icon}<span>{ch.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Save */}
            <button onClick={handleSave} disabled={isSaving}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-60">
                {isSaving ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
        </div>
    );
};

export default NotificationDigestSettings;
