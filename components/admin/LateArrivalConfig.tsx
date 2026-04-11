import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Clock,
    AlertTriangle,
    Save,
    Bell,
    MapPin,
    CheckCircle2,
    Info,
    RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';

const LateArrivalConfig = () => {
    const { currentSchool } = useAuth();
    const [config, setConfig] = useState({
        late_threshold_minutes: 30,
        assembly_time: '08:00',
        auto_notify_parent: true,
        auto_notify_admin: true,
        geofence_enabled: false,
        geofence_radius_meters: 200,
        auto_report_day: 'friday',
        count_towards_attendance: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const data = await api.getLateArrivalConfig(currentSchool?.id);
            if (data && Object.keys(data).length > 0) {
                setConfig(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error('Fetch config error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateLateArrivalConfig(config, currentSchool?.id);
            toast.success('Late arrival settings saved!');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 font-outfit">Late Arrival Configuration</h1>
                <p className="text-sm text-gray-500 mt-1">Configure time thresholds and auto-notification for late arrivals.</p>
            </header>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-700">Students arriving after the assembly time + threshold will be automatically flagged as <strong>Late</strong> in attendance records.</p>
            </div>

            <div className="space-y-4">
                {/* Assembly Time */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><Clock className="w-5 h-5" /></div>
                            <div><h3 className="font-bold text-gray-800">Assembly Time</h3><p className="text-xs text-gray-500">School assembly start time.</p></div>
                        </div>
                        <input type="time" value={config.assembly_time} onChange={e => setConfig({ ...config, assembly_time: e.target.value })}
                            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>

                {/* Threshold */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-red-50 text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                            <div><h3 className="font-bold text-gray-800">Late Threshold (minutes)</h3><p className="text-xs text-gray-500">Minutes after assembly to flag as late.</p></div>
                        </div>
                        <input type="number" min={5} max={120} value={config.late_threshold_minutes} onChange={e => setConfig({ ...config, late_threshold_minutes: parseInt(e.target.value) || 30 })}
                            className="w-24 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 text-center focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>

                {/* Auto Notifications */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Bell className="w-5 h-5" /></div>
                        <h3 className="font-bold text-gray-800">Automatic Notifications</h3>
                    </div>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700">Notify parent when child is late</span>
                        <input type="checkbox" checked={config.auto_notify_parent} onChange={e => setConfig({ ...config, auto_notify_parent: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700">Notify admin of late arrivals</span>
                        <input type="checkbox" checked={config.auto_notify_admin} onChange={e => setConfig({ ...config, auto_notify_admin: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700">Count late arrivals in attendance reports</span>
                        <input type="checkbox" checked={config.count_towards_attendance} onChange={e => setConfig({ ...config, count_towards_attendance: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500" />
                    </label>
                </div>

                {/* Geofence */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><MapPin className="w-5 h-5" /></div>
                            <div><h3 className="font-bold text-gray-800">GPS Geofence Check-in</h3><p className="text-xs text-gray-500">Auto-mark when student enters school area (optional).</p></div>
                        </div>
                        <input type="checkbox" checked={config.geofence_enabled} onChange={e => setConfig({ ...config, geofence_enabled: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500" />
                    </div>
                    {config.geofence_enabled && (
                        <div className="ml-12">
                            <label className="text-sm text-gray-600 block mb-1 font-medium">Geofence radius (meters)</label>
                            <input type="number" min={50} max={1000} value={config.geofence_radius_meters} onChange={e => setConfig({ ...config, geofence_radius_meters: parseInt(e.target.value) || 200 })}
                                className="w-32 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 text-center focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    )}
                </div>

                {/* Auto Report Day */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                            <div><h3 className="font-bold text-gray-800">Auto-Report Day</h3><p className="text-xs text-gray-500">Day to auto-generate and send attendance reports to parents.</p></div>
                        </div>
                        <select value={config.auto_report_day} onChange={e => setConfig({ ...config, auto_report_day: e.target.value })}
                            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none capitalize">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                                <option key={day} value={day} className="capitalize">{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <button onClick={handleSave} disabled={isSaving}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-60">
                {isSaving ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
        </div>
    );
};

export default LateArrivalConfig;
