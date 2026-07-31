import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import {
    getPendingAttendanceRequests,
    approveAttendance,
    rejectAttendance,
} from '../../lib/teacherAttendanceService';
import { CheckCircleIcon, XCircleIcon, ClockIcon, SearchIcon, UserIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface TeacherAttendanceApprovalProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const TeacherAttendanceApproval: React.FC<TeacherAttendanceApprovalProps> = ({ navigateTo }) => {
    const { user, currentSchool } = useAuth();
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

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
            toast.error('Failed to load pending attendance requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (attendanceId: string) => {
        if (!user?.id) return;

        setProcessingId(attendanceId);
        try {
            const result = await approveAttendance(attendanceId, user.id as any);
            if (result.success) {
                toast.success('Attendance approved successfully!');
                loadPendingRequests();
            } else {
                toast.error(`Failed to approve: ${result.error}`);
            }
        } catch (error) {
            console.error('Error approving attendance:', error);
            toast.error('An error occurred while approving attendance.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (attendanceId: string) => {
        if (!user?.id) return;

        const reason = prompt('Please enter a reason for rejection (optional):');

        setProcessingId(attendanceId);
        try {
            const result = await rejectAttendance(attendanceId, user.id as any, reason || undefined);
            if (result.success) {
                toast.success('Attendance rejected.');
                loadPendingRequests();
            } else {
                toast.error(`Failed to reject: ${result.error}`);
            }
        } catch (error) {
            console.error('Error rejecting attendance:', error);
            toast.error('An error occurred while rejecting attendance.');
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
                    <motion.div layout className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 flex items-center space-x-2">
                        <ClockIcon className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-indigo-700">{pendingRequests.length} Pending</span>
                    </motion.div>
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
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 animate-pulse">Loading approval requests...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-green-50 p-6 rounded-full mb-4">
                            <CheckCircleIcon className="h-12 w-12 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">All Caught Up!</h3>
                        <p className="text-gray-500 mt-2 max-w-md">There are no pending attendance requests matching your search. Great job keeping up with approvals.</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence>
                        {filteredRequests.map((request, index) => (
                            <motion.div
                                key={request.id}
                                layout
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.05 }}
                                whileHover={{ y: -3 }}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col"
                            >

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
                                    <motion.button
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.96, y: 0 }}
                                        onClick={() => handleReject(request.id)}
                                        disabled={processingId === request.id}
                                        className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                                    >
                                        {processingId === request.id ? (
                                            <span className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                        ) : (
                                            <XCircleIcon className="h-5 w-5" />
                                        )}
                                        <span>Reject</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.96, y: 0 }}
                                        onClick={() => handleApprove(request.id)}
                                        disabled={processingId === request.id}
                                        className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-colors focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                                    >
                                        {processingId === request.id ? (
                                            <span className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <CheckCircleIcon className="h-5 w-5 text-white" />
                                        )}
                                        <span>Approve</span>
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherAttendanceApproval;
