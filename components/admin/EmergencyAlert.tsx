import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon, MapPinIcon, UserIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import CenteredLoader from '../ui/CenteredLoader';

interface EmergencyAlert {
    id: string;
    alert_type: string;
    title: string;
    message: string;
    severity: string;
    sent_by: string;
    location: string;
    sent_at: string;
    all_clear: boolean;
    target_audiences: string[];
    response_time?: number;
    notes?: string;
    branch_id?: string;
}

const EmergencyAlert: React.FC = () => {
    const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');
    const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
    const [responseNotes, setResponseNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const { currentSchool } = useAuth();
    const { profile } = useProfile();

    useEffect(() => {
        if (!currentSchool) return;
        fetchAlerts();
    }, [filter, currentSchool]);

    const fetchAlerts = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            const data = await api.getEmergencyAlerts(currentSchool.id);
            
            let filteredData = data;
            if (filter === 'active') {
                filteredData = data.filter((a: any) => !a.all_clear);
            } else if (filter === 'resolved') {
                filteredData = data.filter((a: any) => a.all_clear);
            }

            setAlerts(filteredData || []);
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

    const handleResolve = async (alertId: string) => {
        try {
            await api.updateEmergencyAlert(alertId, {
                all_clear: true,
                message: `${selectedAlert?.message}\n\nResolution Notes: ${responseNotes}`
            });

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

    const getStatusColor = (all_clear: boolean) => {
        return all_clear ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
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
                    {alerts.filter(a => !a.all_clear).length > 0 && (
                        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg animate-pulse">
                            <AlertTriangleIcon className="w-5 h-5" />
                            <span className="font-bold">{alerts.filter(a => !a.all_clear).length} Active</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                {(['all', 'active', 'resolved'] as const).map((f) => (
                    <motion.button
                        key={f}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </motion.button>
                ))}
            </div>

            {/* Alerts List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <CenteredLoader className="py-12" />
                ) : alerts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">No {filter === 'all' ? '' : filter} alerts</p>
                    </div>
                ) : (
                    alerts.map((alert, ai) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: Math.min(ai, 10) * 0.04 }}
                            className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getSeverityColor(alert.severity)}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(alert.all_clear)}`}>
                                            {alert.all_clear ? 'Resolved' : 'Active'}
                                        </span>
                                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                                            {alert.severity}
                                        </span>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                                            {alert.alert_type}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{alert.title}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{alert.message}</p>

                                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                        <div className="flex items-center space-x-2 text-gray-700">
                                            <UserIcon className="w-4 h-4" />
                                            <span>Sent by (ID: {alert.sent_by?.substring(0, 8)}...)</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-700">
                                            <MapPinIcon className="w-4 h-4" />
                                            <span>{alert.location || 'Campus Wide'}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-700">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{new Date(alert.sent_at).toLocaleString()}</span>
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

                                {!alert.all_clear && (
                                    <div className="flex flex-col space-y-2">
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => setSelectedAlert(alert)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                                        >
                                            Resolve
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Resolve Modal */}
            <AnimatePresence>
            {selectedAlert && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Resolve Alert</h3>
                        <textarea
                            value={responseNotes}
                            onChange={(e) => setResponseNotes(e.target.value)}
                            placeholder="Enter resolution notes..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
                        ></textarea>
                        <div className="flex space-x-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    setSelectedAlert(null);
                                    setResponseNotes('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleResolve(selectedAlert.id)}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Resolve Alert
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default EmergencyAlert;

