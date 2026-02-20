import React, { useState, useEffect } from 'react';
import { useSaaS } from '../../../contexts/SaaSContext';
import { SaaSSchool } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { exportToCSV, exportToPDF, paginate, formatDate } from '../../../lib/exportUtils';
import { logAuditAction } from '../../../lib/auditLogger';
import api from '../../../lib/api';
import {
    Building,
    MoreVertical,
    Shield,
    ShieldOff,
    CreditCard,
    Users,
    Database,
    Download,
    FileText,
    CheckSquare,
    Square,
    Trash2,
    Eye,
    RefreshCw,
    Filter,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SchoolManagementScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const SchoolManagementScreen: React.FC<SchoolManagementScreenProps> = ({ navigateTo }) => {
    const { schools, refreshSchools, plans } = useSaaS();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [filterSubscription, setFilterSubscription] = useState<string>('all');
    const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<SaaSSchool | null>(null);

    const filteredSchools = schools.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        const matchesPlan = filterPlan === 'all' || s.plan_id?.toString() === filterPlan;
        const matchesSubscription = filterSubscription === 'all' || s.subscription_status === filterSubscription;
        return matchesSearch && matchesStatus && matchesPlan && matchesSubscription;
    });

    const paginatedData = paginate(filteredSchools, currentPage, pageSize);

    const handleStatusChange = async (schoolId: string, newStatus: 'active' | 'suspended') => {
        if (!confirm(`Are you sure you want to ${newStatus} this school?`)) return;

        const { error } = await supabase
            .from('schools')
            .update({ status: newStatus })
            .eq('id', schoolId);

        if (error) {
            toast.error(`Failed to update status: ${error.message}`);
        } else {
            toast.success(`School ${newStatus} successfully.`);
            logAuditAction(newStatus === 'active' ? 'ACTIVATE' : 'SUSPEND', 'SCHOOL', schoolId);
            refreshSchools();
        }
    };

    const handleBulkAction = async (action: 'activate' | 'suspend' | 'delete') => {
        if (selectedSchools.size === 0) {
            toast.error('Please select schools first');
            return;
        }

        if (!confirm(`Are you sure you want to ${action} ${selectedSchools.size} school(s)?`)) {
            return;
        }

        const schoolIds = Array.from(selectedSchools);

        try {
            if (action === 'delete') {
                await api.deleteSchoolsBulk(schoolIds);
                toast.success(`${schoolIds.length} school(s) deleted successfully`);
            } else {
                const newStatus = action === 'activate' ? 'active' : 'suspended';
                await api.updateSchoolStatusBulk(schoolIds, newStatus);
                toast.success(`${schoolIds.length} school(s) ${action}d successfully`);
                logAuditAction(action.toUpperCase() as any, 'SCHOOL', schoolIds.join(','), { count: schoolIds.length });
            }
            setSelectedSchools(new Set());
            refreshSchools();
        } catch (error: any) {
            toast.error(`Failed to ${action} schools: ${error.message}`);
        }
    };

    const handlePlanChange = async (schoolId: string, planId: number) => {
        try {
            await api.updateSchool(schoolId, { plan_id: planId });
            toast.success("Plan updated successfully.");
            refreshSchools();
        } catch (error: any) {
            toast.error(`Failed to change plan: ${error.message}`);
        }
    };

    const toggleSchoolSelection = (schoolId: string) => {
        const newSelection = new Set(selectedSchools);
        if (newSelection.has(schoolId)) {
            newSelection.delete(schoolId);
        } else {
            newSelection.add(schoolId);
        }
        setSelectedSchools(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedSchools.size === paginatedData.items.length) {
            setSelectedSchools(new Set());
        } else {
            setSelectedSchools(new Set(paginatedData.items.map(s => s.id)));
        }
    };

    const handleExportCSV = () => {
        const exportData = filteredSchools.map(school => ({
            Name: school.name,
            Status: school.status,
            Plan: plans.find(p => p.id === school.plan_id)?.name || 'No Plan',
            Subscription: school.subscription_status || 'Unknown',
            'Created At': formatDate(school.created_at)
        }));

        exportToCSV(exportData, 'schools');
    };

    const handleExportPDF = () => {
        const exportData = filteredSchools.map(school => ({
            name: school.name,
            status: school.status,
            plan: plans.find(p => p.id === school.plan_id)?.name || 'No Plan',
            subscription: school.subscription_status || 'Unknown',
            created_at: formatDate(school.created_at)
        }));

        exportToPDF(
            exportData,
            'schools',
            'School Management Report',
            ['School Name', 'Status', 'Plan', 'Subscription', 'Created At'],
            ['name', 'status', 'plan', 'subscription', 'created_at']
        );
    };

    const viewSchoolDetails = (school: SaaSSchool) => {
        setSelectedSchool(school);
        setShowDetailModal(true);
    };

    const clearFilters = () => {
        setFilterStatus('all');
        setFilterPlan('all');
        setFilterSubscription('all');
        setSearchTerm('');
    };

    const hasActiveFilters = filterStatus !== 'all' || filterPlan !== 'all' || filterSubscription !== 'all' || searchTerm !== '';

    return (
        <div className="p-6 bg-white min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">School Management</h1>
                    <p className="text-gray-500">Manage {schools.length} school(s) - {filteredSchools.length} shown</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={refreshSchools}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search schools..."
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                    </select>
                    <select
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={filterPlan}
                        onChange={e => setFilterPlan(e.target.value)}
                    >
                        <option value="all">All Plans</option>
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                    </select>
                    <select
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={filterSubscription}
                        onChange={e => setFilterSubscription(e.target.value)}
                    >
                        <option value="all">All Subscriptions</option>
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="past_due">Past Due</option>
                        <option value="canceled">Canceled</option>
                    </select>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="mt-2 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        <X className="w-4 h-4" />
                        Clear all filters
                    </button>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedSchools.size > 0 && (
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <span className="text-indigo-800 font-medium">
                        {selectedSchools.size} school(s) selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkAction('activate')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Activate
                        </button>
                        <button
                            onClick={() => handleBulkAction('suspend')}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                            Suspend
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-left bg-white">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">
                                <button onClick={toggleSelectAll}>
                                    {selectedSchools.size === paginatedData.items.length ? (
                                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                            </th>
                            <th className="px-6 py-4">School</th>
                            <th className="px-6 py-4">Plan</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Subscription</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {paginatedData.items.map((school) => (
                            <tr key={school.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleSchoolSelection(school.id)}>
                                        {selectedSchools.has(school.id) ? (
                                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                            {school.logoUrl ? <img src={school.logoUrl} className="w-full h-full rounded-full object-cover" alt={school.name} /> : school.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{school.name}</div>
                                            <div className="text-xs text-gray-500">{school.id.substring(0, 8)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={school.plan_id || ''}
                                        onChange={(e) => handlePlanChange(school.id, parseInt(e.target.value))}
                                    >
                                        <option value="">No Plan</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${school.status === 'active' ? 'bg-green-100 text-green-800' :
                                        school.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {school.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${school.subscription_status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                                            {school.subscription_status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                        </span>
                                        {school.trial_ends_at && new Date(school.trial_ends_at) > new Date() && (
                                            <span className="text-xs text-gray-400">Trial ends {new Date(school.trial_ends_at).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => viewSchoolDetails(school)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="View Details"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        {school.status === 'suspended' ? (
                                            <button
                                                onClick={() => handleStatusChange(school.id, 'active')}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                title="Reactivate School"
                                            >
                                                <Shield className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusChange(school.id, 'suspended')}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Suspend School"
                                            >
                                                <ShieldOff className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedData.items.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No schools found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {paginatedData.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSchools.length)} of {filteredSchools.length} schools
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={!paginatedData.hasPrev}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 border rounded-lg bg-indigo-50 text-indigo-600 font-medium">
                            Page {currentPage} of {paginatedData.totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(paginatedData.totalPages, p + 1))}
                            disabled={!paginatedData.hasNext}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedSchool && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">{selectedSchool.name}</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">School ID</p>
                                    <p className="font-medium">{selectedSchool.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${selectedSchool.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {selectedSchool.status.toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Plan</p>
                                    <p className="font-medium">{plans.find(p => p.id === selectedSchool.plan_id)?.name || 'No Plan'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Subscription Status</p>
                                    <p className="font-medium">{selectedSchool.subscription_status || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Created At</p>
                                    <p className="font-medium">{formatDate(selectedSchool.created_at, true)}</p>
                                </div>
                                {selectedSchool.trial_ends_at && (
                                    <div>
                                        <p className="text-sm text-gray-600">Trial Ends</p>
                                        <p className="font-medium">{formatDate(selectedSchool.trial_ends_at)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolManagementScreen;
