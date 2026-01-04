import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon, MapPinIcon, UserIcon } from '../../constants';

interface EmergencyAlert {
    id: number;
    alert_type: string;
    severity_level: string;
    triggered_by: number;
    user_type: string;
    location: string;
    timestamp: string;
    status: string;
    response_time: number | null;
    notes: string;
    trigger_user_name?: string;
}

const EmergencyAlert: React.FC = () => {
    const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');
    const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
    const [responseNotes, setResponseNotes] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();

        // Real-time subscription for new alerts
        const subscription = supabase
            .channel('emergency_alerts_channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'emergency_alerts'
            }, (payload) => {
                fetchAlerts();
                toast.error('🚨 NEW EMERGENCY ALERT!', { duration: 10000 });
                // Play alert sound
                playAlertSound();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [filter]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('emergency_alerts')
                .select('*')
                .order('timestamp', { ascending: false });

            if (filter === 'active') {
                query = query.in('status', ['Active', 'In Progress']);
            } else if (filter === 'resolved') {
                query = query.eq('status', 'Resolved');
            }

            const { data, error } = await query;
            if (error) throw error;

            setAlerts(data || []);
        } catch (error: any) {
            console.error('Error fetching alerts:', error);
            toast.error('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    };

    const playAlertSound = () => {
        // Play emergency alert sound
        const audio = new Audio('/sounds/emergency-alert.mp3');
        audio.play().catch(() => { });
    };

    const handleRespond = async (alertId: number) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const startTime = new Date(selectedAlert?.timestamp || new Date()).getTime();
            const responseTime = Math.floor((Date.now() - startTime) / 1000);

            const { error } = await supabase
                .from('emergency_alerts')
                .update({
                    status: 'In Progress',
                    response_time: responseTime
                })
                .eq('id', alertId);

            if (error) throw error;

            toast.success('Response logged. Stay safe!');
            fetchAlerts();
            setSelectedAlert(null);
        } catch (error: any) {
            toast.error('Failed to update status');
        }
    };

    const handleResolve = async (alertId: number) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('emergency_alerts')
                .update({
                    status: 'Resolved',
                    resolved_by: user.id,
                    resolved_at: new Date().toISOString(),
                    notes: responseNotes
                })
                .eq('id', alertId);

            if (error) throw error;

            toast.success('Alert resolved successfully');
            setResponseNotes('');
            fetchAlerts();
            setSelectedAlert(null);
        } catch (error: any) {
            toast.error('Failed to resolve alert');
        }
    };

    const getSeverityColor = (level: string) => {
        switch (level) {
            case 'Critical': return 'bg-red-100 text-red-800 border-red-500';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-500';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
            default: return 'bg-blue-100 text-blue-800 border-blue-500';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-red-500 text-white';
            case 'In Progress': return 'bg-orange-500 text-white';
            case 'Resolved': return 'bg-green-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Emergency Alerts</h2>
                    <p className="text-sm text-gray-600 mt-1">Monitor and respond to emergencies</p>
                </div>
                <div className="flex items-center space-x-2">
                    {alerts.filter(a => a.status === 'Active').length > 0 && (
                        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg animate-pulse">
                            <AlertTriangleIcon className="w-5 h-5" />
                            <span className="font-bold">{alerts.filter(a => a.status === 'Active').length} Active</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                {(['all', 'active', 'resolved'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Alerts List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">No {filter === 'all' ? '' : filter} alerts</p>
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getSeverityColor(alert.severity_level)}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(alert.status)}`}>
                                            {alert.status}
                                        </span>
                                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                                            {alert.severity_level}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {alert.alert_type}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                        <div className="flex items-center space-x-2 text-gray-700">
                                            <UserIcon className="w-4 h-4" />
                                            <span>{alert.user_type} (ID: {alert.triggered_by})</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-700">
                                            <MapPinIcon className="w-4 h-4" />
                                            <span>{alert.location}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-700">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                                        </div>
                                        {alert.response_time && (
                                            <div className="flex items-center space-x-2 text-gray-700">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                <span>Response: {alert.response_time}s</span>
                                            </div>
                                        )}
                                    </div>

                                    {alert.notes && (
                                        <p className="mt-4 text-sm text-gray-600 italic">
                                            Note: {alert.notes}
                                        </p>
                                    )}
                                </div>

                                {alert.status !== 'Resolved' && (
                                    <div className="flex flex-col space-y-2">
                                        {alert.status === 'Active' && (
                                            <button
                                                onClick={() => handleRespond(alert.id)}
                                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                                            >
                                                Respond
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedAlert(alert)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Resolve Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Resolve Alert</h3>
                        <textarea
                            value={responseNotes}
                            onChange={(e) => setResponseNotes(e.target.value)}
                            placeholder="Enter resolution notes..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
                        ></textarea>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setSelectedAlert(null);
                                    setResponseNotes('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleResolve(selectedAlert.id)}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Resolve Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmergencyAlert;
