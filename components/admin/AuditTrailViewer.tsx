import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Shield, Search, Filter, Download, AlertCircle, CheckCircle, Eye } from 'lucide-react';

interface AuditLog {
    id: number;
    user_email: string;
    user_role: string;
    action_type: string;
    resource_type: string;
    resource_id: number;
    action_description: string;
    old_values: any;
    new_values: any;
    performed_at: string;
    ip_address: string;
    status: string;
    risk_level: string;
    is_sensitive: boolean;
}

const AuditTrailViewer: React.FC = () => {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchAuditLogs();
    }, [dateRange]);

    useEffect(() => {
        applyFilters();
    }, [auditLogs, searchTerm, actionFilter, riskFilter]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('audit_trails')
                .select('*')
                .gte('performed_at', dateRange.start)
                .lte('performed_at', dateRange.end)
                .order('performed_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            setAuditLogs(data || []);
        } catch (error: any) {
            console.error('Error fetching audit logs:', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...auditLogs];

        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (actionFilter !== 'all') {
            filtered = filtered.filter(log => log.action_type === actionFilter);
        }

        if (riskFilter !== 'all') {
            filtered = filtered.filter(log => log.risk_level === riskFilter);
        }

        setFilteredLogs(filtered);
    };

    const getRiskColor = (risk: string) => {
        const colors = {
            'Low': 'bg-green-100 text-green-800',
            'Medium': 'bg-yellow-100 text-yellow-800',
            'High': 'bg-orange-100 text-orange-800',
            'Critical': 'bg-red-100 text-red-800'
        };
        return colors[risk as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status: string) => {
        return status === 'Success'
            ? <CheckCircle className="h-4 w-4 text-green-600" />
            : <AlertCircle className="h-4 w-4 text-red-600" />;
    };

    const exportAuditLog = () => {
        const csv = [
            ['Date/Time', 'User', 'Action', 'Resource', 'Description', 'Risk Level', 'Status', 'IP Address'].join(','),
            ...filteredLogs.map(log => [
                new Date(log.performed_at).toLocaleString(),
                log.user_email,
                log.action_type,
                log.resource_type,
                log.action_description?.replace(/,/g, ';'),
                log.risk_level,
                log.status,
                log.ip_address
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${dateRange.start}-to-${dateRange.end}.csv`;
        a.click();
        toast.success('Audit log exported!');
    };

    const viewDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setShowDetailsModal(true);
    };

    const actionTypes = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Login', 'Logout'];
    const riskLevels = ['Low', 'Medium', 'High', 'Critical'];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">🔒 Audit Trail Viewer</h1>
                        <p className="text-purple-100">Comprehensive system activity and security monitoring</p>
                    </div>
                    <button
                        onClick={exportAuditLog}
                        className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 font-semibold flex items-center space-x-2"
                    >
                        <Download className="h-5 w-5" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600">High Risk</p>
                    <p className="text-2xl font-bold text-orange-600">
                        {filteredLogs.filter(l => l.risk_level === 'High' || l.risk_level === 'Critical').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600">Failed Actions</p>
                    <p className="text-2xl font-bold text-red-600">
                        {filteredLogs.filter(l => l.status !== 'Success').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-sm text-gray-600">Sensitive Data</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {filteredLogs.filter(l => l.is_sensitive).length}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search user, action, or resource..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Action Type</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Actions</option>
                            {actionTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Level</label>
                        <select
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">All Levels</option>
                            {riskLevels.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
                        <div className="flex space-x-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            />
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date/Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resource</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Risk</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                            {new Date(log.performed_at).toLocaleString('en-GB')}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <p className="font-medium text-gray-900">{log.user_email || 'System'}</p>
                                                <p className="text-xs text-gray-500">{log.user_role}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                                {log.action_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{log.resource_type}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                                            {log.action_description}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(log.risk_level)}`}>
                                                {log.risk_level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center">
                                                {getStatusIcon(log.status)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => viewDetails(log)}
                                                className="text-purple-600 hover:text-purple-800"
                                                title="View Details"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p>No audit logs found for the selected filters</p>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">Audit Log Details</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Date/Time</p>
                                        <p className="text-gray-900">{new Date(selectedLog.performed_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">User</p>
                                        <p className="text-gray-900">{selectedLog.user_email || 'System'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Action Type</p>
                                        <p className="text-gray-900">{selectedLog.action_type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Resource</p>
                                        <p className="text-gray-900">{selectedLog.resource_type} #{selectedLog.resource_id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Risk Level</p>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(selectedLog.risk_level)}`}>
                                            {selectedLog.risk_level}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Status</p>
                                        <p className="text-gray-900">{selectedLog.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">IP Address</p>
                                        <p className="text-gray-900">{selectedLog.ip_address}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Sensitive Data</p>
                                        <p className="text-gray-900">{selectedLog.is_sensitive ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                                    <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedLog.action_description}</p>
                                </div>

                                {selectedLog.old_values && (
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Previous Values</p>
                                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                            {JSON.stringify(selectedLog.old_values, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {selectedLog.new_values && (
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 mb-2">New Values</p>
                                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                            {JSON.stringify(selectedLog.new_values, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="mt-6 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditTrailViewer;
