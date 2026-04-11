import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Shield,
    Clock,
    MapPin,
    LogOut,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Key,
    Fingerprint,
    Eye
} from 'lucide-react';
import { api } from '../../lib/api';

const SessionManagementScreen = () => {
    const { currentSchool } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const data = await api.getSessions();
            setSessions(data);
        } catch (error) {
            console.error('Fetch sessions error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDeviceIcon = (userAgent: string | null) => {
        if (!userAgent) return Monitor;
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('android')) return Smartphone;
        if (ua.includes('tablet') || ua.includes('ipad')) return Tablet;
        return Monitor;
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const handleRevoke = async (id: string) => {
        setRevoking(id);
        try {
            await api.revokeSession(id);
            toast.success('Session terminated');
            fetchSessions();
        } catch (error: any) {
            toast.error('Revoke failed');
        } finally {
            setRevoking(null);
        }
    };

    const handleRevokeAll = async () => {
        if (!window.confirm('Terminate all sessions? You will need to log in again on other devices.')) return;
        try {
            await api.revokeAllSessions();
            toast.success('All sessions terminated');
            fetchSessions();
        } catch (error: any) {
            toast.error('Revoke all failed');
        }
    };

    const activeSessions = sessions.filter(s => {
        const hoursSinceActive = (Date.now() - new Date(s.last_active).getTime()) / 3600000;
        return hoursSinceActive < 24;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 font-outfit">Session & Device Management</h1>
                <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Monitor and control active sessions across all devices.</span>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Monitor className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{sessions.length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sessions</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active (24h)</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><Smartphone className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{sessions.filter(s => s.device_type === 'mobile').length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><Globe className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{new Set(sessions.map(s => s.location)).size}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Locations</p></div>
                </div>
            </div>

            {/* Revoke All Bar */}
            <div className="flex items-center justify-between bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <p className="text-sm font-medium text-gray-600">See a session you don't recognize? Revoke it immediately and change your password.</p>
                </div>
                <button onClick={handleRevokeAll} className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all text-sm">
                    <LogOut className="w-4 h-4" /><span>Revoke All Others</span>
                </button>
            </div>

            {/* Session Cards */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-700">Active Sessions</h2>
                {sessions.map(session => {
                    const DeviceIcon = getDeviceIcon(session.user_agent);
                    return (
                        <div key={session.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all hover:shadow-md ${session.is_current ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4">
                                    <div className={`p-3 rounded-2xl ${session.is_current ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                                        <DeviceIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-3">
                                            <h3 className="font-bold text-gray-900">{session.device_type || 'Unknown Device'}</h3>
                                            {session.is_current && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">This Device</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 truncate max-w-md">{session.user_agent || 'Web Browser'}</p>
                                        <div className="flex items-center space-x-4 mt-3">
                                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                <MapPin className="w-3 h-3" /><span>{session.location || 'Unknown Location'}</span>
                                            </div>
                                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                <Globe className="w-3 h-3" /><span>{session.ip_address || 'Hidden IP'}</span>
                                            </div>
                                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" /><span>Active {getTimeAgo(session.last_active)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {!session.is_current && (
                                    <button onClick={() => handleRevoke(session.id)} disabled={revoking === session.id}
                                        className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50">
                                        {revoking === session.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                        <span>{revoking === session.id ? 'Revoking...' : 'Revoke'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {sessions.length === 0 && !loading && (
                    <div className="px-6 py-10 text-center text-gray-500">No active sessions found.</div>
                )}
            </div>

            {/* Security Tips */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Security Recommendations</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                        <Key className="w-5 h-5 text-indigo-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-sm">Change Password</h3>
                        <p className="text-xs text-gray-500 mt-1">Rotate your password every 90 days for maximum security.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                        <Fingerprint className="w-5 h-5 text-emerald-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-sm">Enable 2FA</h3>
                        <p className="text-xs text-gray-500 mt-1">Add an extra layer of protection with two-factor authentication.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                        <Eye className="w-5 h-5 text-amber-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-sm">Review Regularly</h3>
                        <p className="text-xs text-gray-500 mt-1">Check active sessions weekly. Revoke any you don't recognize.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionManagementScreen;
