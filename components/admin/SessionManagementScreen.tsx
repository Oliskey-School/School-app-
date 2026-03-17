import React, { useState } from 'react';
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
    Trash2,
    RefreshCw,
    Key,
    Fingerprint,
    Eye
} from 'lucide-react';

interface UserSession {
    id: string;
    device_name: string;
    device_type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    ip_address: string;
    location: string;
    is_current: boolean;
    last_active: string;
    created_at: string;
}

const SessionManagementScreen = () => {
    const { currentSchool } = useAuth();
    const [sessions, setSessions] = useState<UserSession[]>([
        { id: '1', device_name: 'Windows 11 PC', device_type: 'desktop', browser: 'Chrome 120', ip_address: '105.112.**.***', location: 'Lagos, Nigeria', is_current: true, last_active: '2026-03-17T22:15:00', created_at: '2026-03-17T08:00:00' },
        { id: '2', device_name: 'iPhone 15 Pro', device_type: 'mobile', browser: 'Safari 17', ip_address: '105.112.**.***', location: 'Lagos, Nigeria', is_current: false, last_active: '2026-03-17T21:30:00', created_at: '2026-03-17T07:30:00' },
        { id: '3', device_name: 'Samsung Galaxy S24', device_type: 'mobile', browser: 'Chrome Mobile', ip_address: '41.203.**.***', location: 'Abuja, Nigeria', is_current: false, last_active: '2026-03-16T18:45:00', created_at: '2026-03-16T09:00:00' },
        { id: '4', device_name: 'iPad Air', device_type: 'tablet', browser: 'Safari 17', ip_address: '105.112.**.***', location: 'Lagos, Nigeria', is_current: false, last_active: '2026-03-15T14:00:00', created_at: '2026-03-15T10:00:00' },
        { id: '5', device_name: 'MacBook Pro', device_type: 'desktop', browser: 'Firefox 122', ip_address: '196.46.**.***', location: 'Port Harcourt, Nigeria', is_current: false, last_active: '2026-03-14T16:20:00', created_at: '2026-03-14T08:30:00' },
    ]);
    const [revoking, setRevoking] = useState<string | null>(null);

    const getDeviceIcon = (type: string) => {
        if (type === 'desktop') return Monitor;
        if (type === 'mobile') return Smartphone;
        return Tablet;
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

    const handleRevoke = (id: string) => {
        setRevoking(id);
        setTimeout(() => {
            setSessions(prev => prev.filter(s => s.id !== id));
            setRevoking(null);
            toast.success('Session terminated');
        }, 1500);
    };

    const handleRevokeAll = () => {
        if (!window.confirm('Terminate all other sessions? You will remain logged in on this device only.')) return;
        setSessions(prev => prev.filter(s => s.is_current));
        toast.success('All other sessions terminated');
    };

    const activeSessions = sessions.filter(s => {
        const hoursSinceActive = (Date.now() - new Date(s.last_active).getTime()) / 3600000;
        return hoursSinceActive < 24;
    });
    const inactiveSessions = sessions.filter(s => {
        const hoursSinceActive = (Date.now() - new Date(s.last_active).getTime()) / 3600000;
        return hoursSinceActive >= 24;
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
                    const DeviceIcon = getDeviceIcon(session.device_type);
                    return (
                        <div key={session.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all hover:shadow-md ${session.is_current ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4">
                                    <div className={`p-3 rounded-2xl ${session.is_current ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                                        <DeviceIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-3">
                                            <h3 className="font-bold text-gray-900">{session.device_name}</h3>
                                            {session.is_current && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">This Device</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{session.browser}</p>
                                        <div className="flex items-center space-x-4 mt-3">
                                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                <MapPin className="w-3 h-3" /><span>{session.location}</span>
                                            </div>
                                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                <Globe className="w-3 h-3" /><span>{session.ip_address}</span>
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
