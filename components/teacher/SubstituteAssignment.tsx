import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { UsersIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from '../../constants';

interface SubstituteRequest {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    class_name: string;
    original_teacher_name: string;
    status: string;
}

function fmtDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const STATUS_STYLES: Record<string, string> = {
    Assigned: 'bg-yellow-100 text-yellow-800',
    Accepted: 'bg-green-100 text-green-800',
    Declined: 'bg-red-100 text-red-800',
    Completed: 'bg-gray-100 text-gray-600',
};

const SubstituteAssignment: React.FC = () => {
    const [requests, setRequests] = useState<SubstituteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [errorOccurred, setErrorOccurred] = useState(false);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            setErrorOccurred(false);
            const data = await api.getMySubstituteAssignments();
            setRequests(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Error fetching substitute assignments:', error);
            setErrorOccurred(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const respond = async (id: string, response: 'Accepted' | 'Declined') => {
        setRespondingId(id);
        try {
            await api.respondToSubstituteAssignment(id, response);
            toast.success(response === 'Accepted' ? 'Assignment accepted' : 'Assignment declined');
            fetchRequests();
        } catch (error: any) {
            toast.error(error?.message || `Failed to ${response.toLowerCase()}`);
        } finally {
            setRespondingId(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Substitute Assignments</h2>
                <p className="text-sm text-gray-600 mt-1">Coverage requests for your review</p>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : errorOccurred ? (
                    <div className="text-center py-12 text-amber-700">
                        <AlertTriangleIcon className="w-16 h-16 text-amber-300 mx-auto mb-4" />
                        <p className="font-semibold">Couldn't load substitute assignments</p>
                        <p className="text-sm text-amber-600 mt-1 mb-4">There was a problem reaching the server. Please try again.</p>
                        <button
                            onClick={fetchRequests}
                            className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
                        >
                            Retry
                        </button>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No substitute requests</p>
                    </div>
                ) : (
                    requests.map(req => (
                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900">{req.class_name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">Cover for: {req.original_teacher_name}</p>
                                    <p className="text-sm text-gray-600">
                                        📅 {fmtDate(req.date)}{req.start_time ? ` | ${req.start_time}–${req.end_time}` : ''}
                                    </p>
                                </div>
                                {req.status === 'Assigned' && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => respond(req.id, 'Accepted')}
                                            disabled={respondingId === req.id}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-1 disabled:opacity-60"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span>Accept</span>
                                        </button>
                                        <button
                                            onClick={() => respond(req.id, 'Declined')}
                                            disabled={respondingId === req.id}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-1 disabled:opacity-60"
                                        >
                                            <XCircleIcon className="w-4 h-4" />
                                            <span>Decline</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SubstituteAssignment;
