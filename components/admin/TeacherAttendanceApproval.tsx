import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import {
    getPendingAttendanceRequests,
    approveAttendance,
    rejectAttendance,
} from '../../lib/teacherAttendanceService';
import { CheckCircleIcon, XCircleIcon, ClockIcon, SearchIcon, UserIcon } from '../../constants';

interface TeacherAttendanceApprovalProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

// Simple Toast Notification Component
const NotificationToast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 transition-all duration-300 transform translate-y-0 z-50 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {type === 'success' ? <CheckCircleIcon className="h-6 w-6" /> : <XCircleIcon className="h-6 w-6" />}
            <span className="font-semibold">{message}</span>
        </div>
    );
};

const TeacherAttendanceApproval: React.FC<TeacherAttendanceApprovalProps> = ({ navigateTo }) => {
    const { user, currentSchool } = useAuth();
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadPendingRequests();
    }, []);

    useAutoSync(['staff_attendance'], () => {
        console.log('🔄 [TeacherAttendanceApproval] Real-time auto-sync triggered');
        loadPendingRequests();
    });

    const loadPendingRequests = async () => {
        setLoading(true);
        try {
            const result = await getPendingAttendanceRequests(currentSchool?.id);
            if (result.success && result.data) {
                setPendingRequests(result.data);
            }
        } catch (error) {
            console.error('Error loading pending requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
    };



    const handleApprove = async (attendanceId: string) => {
        if (!user?.id) return;

        setProcessingId(attendanceId);
        try {
            // Pass user.id even if it's a string. We'll update service to accept `string | number`.
            const result = await approveAttendance(attendanceId, user.id as any);
            if (result.success) {
                showNotification('Attendance approved successfully!', 'success');
                loadPendingRequests();
            } else {
                showNotification(`Failed to approve: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error approving attendance:', error);
            showNotification('An error occurred while approving attendance.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (attendanceId: string) => {
        if (!user?.id) return;

        const reason = prompt('Please enter a reason for rejection (optional):');

        setProcessingId(attendanceId);
        try {
            // Pass user.id even if it's a string. We'll update service to accept `string | number`.
            const result = await rejectAttendance(attendanceId, user.id as any, reason || undefined);
            if (result.success) {
                showNotification('Attendance rejected.', 'success');
                loadPendingRequests();
            } else {
                showNotification(`Failed to reject: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error rejecting attendance:', error);
            showNotification('An error occurred while rejecting attendance.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return 'N/A';
        // If it's already HH:mm format, just return it or format to AM/PM
        if (timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            const h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        }
        return timeString;
    };

    const filteredRequests = pendingRequests.filter((request) =>
        request.teacher?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans">
            {/* Rich Header */}
            <div className="bg-white px-8 py-6 border-b border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Attendance Approvals</h1>
                    <p className="text-gray-500 mt-1">Review and manage daily teacher check-ins.</p>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 flex items-center space-x-2">
                        <ClockIcon className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-indigo-700">{pendingRequests.length} Pending</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow overflow-y-auto p-4 md:p-8">

                {/* Search & Filter Bar */}
                <div className="mb-8 max-w-2xl mx-auto md:mx-0">
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by teacher name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm outline-none"
                        />
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-green-50 p-6 rounded-full mb-4">
                            <CheckCircleIcon className="h-12 w-12 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">All Caught Up!</h3>
                        <p className="text-gray-500 mt-2 max-w-md">There are no pending attendance requests matching your search. Great job keeping up with approvals.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredRequests.map((request, index) => (
                            <div key={request.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>

                                <div className="flex items-center space-x-4 mb-5">
                                    <div className="relative">
                                        {request.teacher?.avatar_url ? (
                                            <img
                                                src={request.teacher.avatar_url}
                                                alt={request.teacher?.full_name}
                                                className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white ring-2 ring-gray-100"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white ring-2 ring-gray-100 text-indigo-500">
                                                <UserIcon className="h-8 w-8" />
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 bg-amber-400 p-1 rounded-full border-2 border-white" title="Pending">
                                            <ClockIcon className="h-3 w-3 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{request.teacher?.full_name || 'Unknown Teacher'}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{request.teacher?.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium">Date</span>
                                        <span className="text-gray-900 font-semibold">{formatDate(request.date)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium">Check-in</span>
                                        <span className="text-gray-900 font-semibold font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{formatTime(request.check_in)}</span>
                                    </div>
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleReject(request.id)}
                                        disabled={processingId === request.id}
                                        className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                                    >
                                        <XCircleIcon className="h-5 w-5" />
                                        <span>Reject</span>
                                    </button>
                                    <button
                                        onClick={() => handleApprove(request.id)}
                                        disabled={processingId === request.id}
                                        className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        <CheckCircleIcon className="h-5 w-5 text-white" />
                                        <span>Approve</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notification Toast */}
            {notification && (
                <NotificationToast
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
};

export default TeacherAttendanceApproval;

