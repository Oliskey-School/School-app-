import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    UserGroupIcon,
    CalendarIcon
} from '../../constants';

interface LeaveRequestData {
    id: number;
    teacher_id: string;
    teacher_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_requested: number;
    reason: string;
    notes?: string;
    status: string;
    created_at: string;
    admin_comments?: string;
}

interface LeaveApprovalProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const LeaveApproval: React.FC<LeaveApprovalProps> = () => {
    const [requests, setRequests] = useState<LeaveRequestData[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequestData | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('leave_requests')
                .select(`
          *,
          teachers (
            full_name
          ),
          leave_types (
            name
          )
        `)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                const statusMap = {
                    pending: 'Pending',
                    approved: 'Approved',
                    rejected: 'Rejected'
                };
                query = query.eq('status', statusMap[filter]);
            }

            const { data, error } = await query;

            if (error) throw error;

            const formatted: LeaveRequestData[] = (data || []).map((item: any) => ({
                id: item.id,
                teacher_id: item.teacher_id,
                teacher_name: item.teachers?.full_name || 'Unknown Teacher',
                leave_type: item.leave_types?.name || 'Unknown Type',
                start_date: item.start_date,
                end_date: item.end_date,
                days_requested: item.days_requested,
                reason: item.reason,
                notes: item.notes,
                status: item.status,
                created_at: item.created_at,
                admin_comments: item.admin_comments
            }));

            setRequests(formatted);
        } catch (error: any) {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load leave requests');
        } finally {
            setLoading(false);
        }
    };

    const updateLeaveBalance = async (teacherId: string, leaveTypeId: number, days: number, approved: boolean) => {
        try {
            if (!approved) return; // Don't update balance if rejected

            // Get current balance
            const { data: balanceData } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('teacher_id', teacherId)
                .eq('leave_type_id', leaveTypeId)
                .single();

            if (balanceData) {
                // Update existing balance
                const newUsedDays = balanceData.used_days + days;
                const newRemainingDays = balanceData.total_days - newUsedDays;

                await supabase
                    .from('leave_balances')
                    .update({
                        used_days: newUsedDays,
                        remaining_days: newRemainingDays
                    })
                    .eq('id', balanceData.id);
            }
        } catch (error) {
            console.error('Error updating leave balance:', error);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;

        try {
            setProcessing(true);

            // Update request status
            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: 'Approved',
                    admin_comments: adminComment || null,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            if (error) throw error;

            //  Get leave_type_id for balance update
            const { data: requestData } = await supabase
                .from('leave_requests')
                .select('leave_type_id')
                .eq('id', selectedRequest.id)
                .single();

            if (requestData) {
                await updateLeaveBalance(
                    selectedRequest.teacher_id,
                    requestData.leave_type_id,
                    selectedRequest.days_requested,
                    true
                );
            }

            toast.success('Leave request approved');
            setSelectedRequest(null);
            setAdminComment('');
            fetchRequests();
        } catch (error: any) {
            console.error('Error approving request:', error);
            toast.error('Failed to approve request');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        if (!adminComment.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        try {
            setProcessing(true);

            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: 'Rejected',
                    admin_comments: adminComment,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            if (error) throw error;

            toast.success('Leave request rejected');
            setSelectedRequest(null);
            setAdminComment('');
            fetchRequests();
        } catch (error: any) {
            console.error('Error rejecting request:', error);
            toast.error('Failed to reject request');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-800';
            case 'Rejected':
                return 'bg-red-100 text-red-800';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'Pending').length,
        approved: requests.filter(r => r.status === 'Approved').length,
        rejected: requests.filter(r => r.status === 'Rejected').length
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Approvals</h2>
                <p className="text-sm text-gray-600 mt-1">Review and approve teacher leave requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-yellow-700">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700">Approved</p>
                    <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-700">Rejected</p>
                    <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
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

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Leave Requests</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No {filter !== 'all' && filter} requests found
                        </div>
                    ) : (
                        requests.map((request) => (
                            <div key={request.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <UserGroupIcon className="w-5 h-5 text-gray-400" />
                                            <h4 className="font-semibold text-gray-900">{request.teacher_name}</h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-700">
                                                <strong>{request.leave_type}</strong> - {request.days_requested} day(s)
                                            </p>
                                            <p className="text-gray-600">
                                                📅 {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-gray-600">
                                                <strong>Reason:</strong> {request.reason}
                                            </p>
                                            {request.notes && (
                                                <p className="text-gray-500 text-xs">
                                                    <strong>Notes:</strong> {request.notes}
                                                </p>
                                            )}
                                            {request.admin_comments && (
                                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                                    <strong>Admin Comment:</strong> {request.admin_comments}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {request.status === 'Pending' && (
                                        <button
                                            onClick={() => setSelectedRequest(request)}
                                            className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                        >
                                            Review
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Review Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Review Leave Request</h3>

                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Teacher</p>
                                        <p className="font-semibold">{selectedRequest.teacher_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Leave Type</p>
                                        <p className="font-semibold">{selectedRequest.leave_type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Duration</p>
                                        <p className="font-semibold">{selectedRequest.days_requested} day(s)</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Dates</p>
                                        <p className="font-semibold text-sm">
                                            {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Reason</p>
                                    <p className="text-gray-900">{selectedRequest.reason}</p>
                                </div>

                                {selectedRequest.notes && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Additional Notes</p>
                                        <p className="text-gray-900">{selectedRequest.notes}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Comment
                                    </label>
                                    <textarea
                                        value={adminComment}
                                        onChange={(e) => setAdminComment(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        rows={3}
                                        placeholder="Add comment (required for rejection)"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleApprove}
                                    disabled={processing}
                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>{processing ? 'Processing...' : 'Approve'}</span>
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                    <span>{processing ? 'Processing...' : 'Reject'}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedRequest(null);
                                        setAdminComment('');
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveApproval;
