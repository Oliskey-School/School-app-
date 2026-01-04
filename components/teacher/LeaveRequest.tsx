import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import LeaveBalanceTracker from '../shared/LeaveBalanceTracker';
import {
    CalendarIcon,
    DocumentTextIcon,
    PlusIcon,
    ClockIcon
} from '../../constants';

interface LeaveRequestProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
}

interface LeaveType {
    id: number;
    name: string;
    default_days: number;
    requires_approval: boolean;
}

interface RequestFormData {
    leave_type_id: number;
    start_date: string;
    end_date: string;
    reason: string;
    notes?: string;
}

const LeaveRequest: React.FC<LeaveRequestProps> = () => {
    const { profile } = useProfile();
    const [teacherId, setTeacherId] = useState<number | null>(null);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<RequestFormData>({
        leave_type_id: 0,
        start_date: '',
        end_date: '',
        reason: '',
        notes: ''
    });

    useEffect(() => {
        initialize();
    }, []);

    const initialize = async () => {
        try {
            // Get teacher ID from email
            const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (teacherError || !teacherData) {
                console.error('Teacher not found');
                setLoading(false);
                return;
            }

            setTeacherId(teacherData.id);
            await fetchLeaveTypes();
            await fetchMyRequests(teacherData.id);
        } catch (error: any) {
            console.error('Error initializing:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveTypes = async () => {
        const { data, error } = await supabase
            .from('leave_types')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching leave types:', error);
            return;
        }

        setLeaveTypes(data || []);
        if (data && data.length > 0) {
            setFormData(prev => ({ ...prev, leave_type_id: data[0].id }));
        }
    };

    const fetchMyRequests = async (tId: number) => {
        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
        *,
        leave_types (name)
      `)
            .eq('teacher_id', tId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching requests:', error);
            return;
        }

        setMyRequests(data || []);
    };

    const calculateDays = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end
        return diffDays;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!teacherId) {
            toast.error('Teacher ID not found');
            return;
        }

        if (!formData.start_date || !formData.end_date) {
            toast.error('Please select start and end dates');
            return;
        }

        if (new Date(formData.end_date) < new Date(formData.start_date)) {
            toast.error('End date must be after start date');
            return;
        }

        try {
            setSubmitting(true);
            const days = calculateDays(formData.start_date, formData.end_date);

            const { error } = await supabase
                .from('leave_requests')
                .insert({
                    teacher_id: teacherId,
                    leave_type_id: formData.leave_type_id,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    days_requested: days,
                    reason: formData.reason,
                    notes: formData.notes,
                    status: 'Pending'
                });

            if (error) throw error;

            toast.success('Leave request submitted successfully');
            setShowForm(false);
            setFormData({
                leave_type_id: leaveTypes[0]?.id || 0,
                start_date: '',
                end_date: '',
                reason: '',
                notes: ''
            });

            if (teacherId) {
                await fetchMyRequests(teacherId);
            }
        } catch (error: any) {
            console.error('Error submitting request:', error);
            toast.error('Failed to submit leave request');
        } finally {
            setSubmitting(false);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!teacherId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <p className="text-yellow-800">Teacher profile not found. Please contact HR.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Leave Requests</h2>
                    <p className="text-sm text-gray-600 mt-1">Submit and track your leave applications</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Request</span>
                </button>
            </div>

            {/* Leave Balance Summary */}
            <LeaveBalanceTracker teacherId={teacherId} compact />

            {/* Request Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Leave Request</h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Leave Type
                                    </label>
                                    <select
                                        value={formData.leave_type_id}
                                        onChange={(e) => setFormData({ ...formData, leave_type_id: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                    >
                                        {leaveTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name} ({type.default_days} days)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            required
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            required
                                            min={formData.start_date || new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>

                                {formData.start_date && formData.end_date && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                        <p className="text-sm text-indigo-800">
                                            <strong>Duration:</strong> {calculateDays(formData.start_date, formData.end_date)} day(s)
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason
                                    </label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        rows={3}
                                        required
                                        placeholder="Brief reason for leave request"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Additional Notes (Optional)
                                    </label>
                                    <textarea
                                        value={formData.notes || ''}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        rows={2}
                                        placeholder="Any additional information"
                                    />
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-gray-400"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* My Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">My Leave Requests</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {myRequests.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No leave requests yet
                        </div>
                    ) : (
                        myRequests.map((request) => (
                            <div key={request.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-semibold text-gray-900">
                                                {request.leave_types?.name || 'Unknown Type'}
                                            </h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                            <span>📅 {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</span>
                                            <span>⏱ {request.days_requested} day(s)</span>
                                        </div>
                                        {request.admin_comments && (
                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                                <strong>Admin Comment:</strong> {request.admin_comments}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeaveRequest;
