import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
    Bell,
    Send,
    AlertCircle,
    Info,
    Megaphone,
    Clock,
    CheckCircle,
    XCircle,
    Search,
    Filter,
    RefreshCw
} from 'lucide-react';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'announcement' | 'alert' | 'maintenance' | 'update';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    target_schools: string[] | null;
    sent_at: string | null;
    expires_at: string | null;
    created_at: string;
}

interface NotificationCenterProps {
    navigateTo?: (screen: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ navigateTo }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [filter, setFilter] = useState<'all' | 'sent' | 'scheduled'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'announcement' as 'announcement' | 'alert' | 'maintenance' | 'update',
        priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
        targetSchools: [] as string[],
        expiresAt: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [notificationsData, schoolsData] = await Promise.all([
                api.getPlatformNotifications(),
                api.getSchools()
            ]);

            setNotifications(notificationsData || []);
            setSchools(schoolsData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendNotification = async () => {
        if (!formData.title || !formData.message) {
            return;
        }

        try {
            setSending(true);

            await api.sendPlatformNotification({
                title: formData.title,
                message: formData.message,
                type: formData.type,
                priority: formData.priority,
                targetSchools: formData.targetSchools,
                expiresAt: formData.expiresAt || null
            });

            // Reset form
            setFormData({
                title: '',
                message: '',
                type: 'announcement',
                priority: 'normal',
                targetSchools: [],
                expiresAt: ''
            });

            fetchData();
        } catch (error) {
            console.error('Error sending notification:', error);
        } finally {
            setSending(false);
        }
    };

    const handleSchoolSelection = (schoolId: string) => {
        setFormData(prev => ({
            ...prev,
            targetSchools: prev.targetSchools.includes(schoolId)
                ? prev.targetSchools.filter(id => id !== schoolId)
                : [...prev.targetSchools, schoolId]
        }));
    };

    const selectAllSchools = () => {
        setFormData(prev => ({
            ...prev,
            targetSchools: schools.map(s => s.id)
        }));
    };

    const clearSelection = () => {
        setFormData(prev => ({
            ...prev,
            targetSchools: []
        }));
    };

    const filteredNotifications = notifications.filter(notif => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'sent' && notif.sent_at) ||
            (filter === 'scheduled' && !notif.sent_at);

        const matchesSearch =
            notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notif.message.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'announcement': return <Megaphone className="w-5 h-5 text-blue-500" />;
            case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'maintenance': return <Clock className="w-5 h-5 text-orange-500" />;
            case 'update': return <Info className="w-5 h-5 text-green-500" />;
            default: return <Bell className="w-5 h-5 text-gray-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'normal': return 'bg-blue-100 text-blue-800';
            case 'low': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Notification Center</h1>
                    <p className="text-gray-600 mt-1">Send announcements and alerts to schools</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Notification Form */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="w-5 h-5 text-indigo-600" />
                                Create Notification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Notification title"
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message *
                                </label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Notification message"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="announcement">Announcement</option>
                                    <option value="alert">Alert</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="update">Update</option>
                                </select>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>

                            {/* Expires At */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expires At (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.expiresAt}
                                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Target Schools */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Target Schools
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        onClick={selectAllSchools}
                                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={clearSelection}
                                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                                    {schools.map(school => (
                                        <label key={school.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.targetSchools.includes(school.id)}
                                                onChange={() => handleSchoolSelection(school.id)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm">{school.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.targetSchools.length === 0
                                        ? 'Send to all schools'
                                        : `${formData.targetSchools.length} school(s) selected`}
                                </p>
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSendNotification}
                                disabled={sending}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Notification
                                    </>
                                )}
                            </button>
                        </CardContent>
                    </Card>
                </div>

                {/* Notification History */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Filters */}
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search notifications..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-gray-400" />
                                    <select
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value as any)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="all">All</option>
                                        <option value="sent">Sent</option>
                                        <option value="scheduled">Scheduled</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notifications List */}
                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No notifications found
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {filteredNotifications.map((notif) => (
                                        <div key={notif.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    {getTypeIcon(notif.type)}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(notif.priority)}`}>
                                                                {notif.priority}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-2">{notif.message}</p>
                                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                {notif.sent_at ? (
                                                                    <>
                                                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                                                        Sent {formatDate(notif.sent_at)}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Clock className="w-3 h-3 text-orange-500" />
                                                                        Scheduled
                                                                    </>
                                                                )}
                                                            </span>
                                                            <span>
                                                                {notif.target_schools
                                                                    ? `${notif.target_schools.length} school(s)`
                                                                    : 'All schools'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;

