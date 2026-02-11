import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getStudentAttendanceStats, getDropoutAlerts, resolveDropoutAlert } from '../../lib/qr-attendance';

export function AttendanceAnalytics() {
    const [stats, setStats] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<any>(null);
    const [resolveNotes, setResolveNotes] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const alertData = await getDropoutAlerts({ resolved: false });
        setAlerts(alertData);
        setLoading(false);
    };

    const handleResolveAlert = async (alertId: string) => {
        if (!resolveNotes.trim()) {
            toast.error('Please add resolution notes');
            return;
        }

        const success = await resolveDropoutAlert(alertId, resolveNotes);
        if (success) {
            setSelectedAlert(null);
            setResolveNotes('');
            loadData();
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-600';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-600';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-600';
            default: return 'bg-blue-100 text-blue-800 border-blue-600';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⚡';
            default: return 'ℹ️';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Analytics</h1>
                <p className="text-gray-600">Monitor attendance and identify at-risk students</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">🚨</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Critical Alerts</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {alerts.filter(a => a.severity === 'critical').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">High Priority</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {alerts.filter(a => a.severity === 'high').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Medium Priority</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {alerts.filter(a => a.severity === 'medium').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">✅</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Students</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {new Set(alerts.map(a => a.student_id)).size}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dropout Alerts */}
            <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">At-Risk Student Alerts</h2>
                    <p className="text-sm text-gray-600 mt-1">Early warning system for dropout prevention</p>
                </div>

                {alerts.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-600">No active alerts - all students on track!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="p-6 hover:bg-gray-50 cursor-pointer transition"
                                onClick={() => setSelectedAlert(alert)}
                            >
                                <div className="flex items-start gap-4">
                                    <span className="text-3xl">{getSeverityIcon(alert.severity)}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-gray-900 text-lg">
                                                {alert.student?.name || 'Unknown Student'}
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                                                {alert.severity.toUpperCase()}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-2">
                                            Grade {alert.student?.grade}{alert.student?.section} •
                                            {alert.alert_type === 'consecutive_absences' && (
                                                <> {alert.consecutive_absences} consecutive absences</>
                                            )}
                                            {alert.alert_type === 'low_attendance' && (
                                                <> {alert.attendance_rate}% attendance rate</>
                                            )}
                                        </p>

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>
                                                📅 {new Date(alert.created_at).toLocaleDateString()}
                                            </span>
                                            <span>
                                                🔔 Alert Type: {alert.alert_type.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Alert Detail Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedAlert.student?.name}</h2>
                                    <p className="text-gray-600">Grade {selectedAlert.student?.grade}{selectedAlert.student?.section}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedAlert(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2">Alert Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600">Severity</p>
                                            <p className="font-medium capitalize">{selectedAlert.severity}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Alert Type</p>
                                            <p className="font-medium">{selectedAlert.alert_type.replace('_', ' ')}</p>
                                        </div>
                                        {selectedAlert.consecutive_absences && (
                                            <div>
                                                <p className="text-gray-600">Consecutive Absences</p>
                                                <p className="font-medium">{selectedAlert.consecutive_absences} days</p>
                                            </div>
                                        )}
                                        {selectedAlert.attendance_rate && (
                                            <div>
                                                <p className="text-gray-600">Attendance Rate</p>
                                                <p className="font-medium">{selectedAlert.attendance_rate}%</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-gray-600">Created</p>
                                            <p className="font-medium">{new Date(selectedAlert.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Resolution Notes
                                    </label>
                                    <textarea
                                        value={resolveNotes}
                                        onChange={(e) => setResolveNotes(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="Document actions taken and outcome..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedAlert(null)}
                                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleResolveAlert(selectedAlert.id)}
                                    disabled={!resolveNotes.trim()}
                                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
                                >
                                    Mark as Resolved
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
