import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface IDVerificationRequest {
    id: string;
    user_id: string;
    document_url: string;
    document_type: string;
    status: 'pending' | 'approved' | 'rejected';
    notes: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
        role: string;
    };
}

export function IDVerificationPanel() {
    const [requests, setRequests] = useState<IDVerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<IDVerificationRequest | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('id_verification_requests')
                .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            role
          )
        `)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error('Load requests error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Update verification request
            const { error: updateError } = await supabase
                .from('id_verification_requests')
                .update({
                    status: 'approved',
                    notes: reviewNotes,
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Update profile verification status
            const request = requests.find(r => r.id === requestId);
            if (request) {
                await supabase
                    .from('profiles')
                    .update({
                        verification_status: 'verified',
                        verified_by: user?.id,
                        verified_at: new Date().toISOString(),
                        verification_notes: reviewNotes
                    })
                    .eq('id', request.user_id);

                // Log audit trail
                await supabase.from('verification_audit_log').insert({
                    user_id: request.user_id,
                    action: 'id_approved',
                    details: { request_id: requestId, notes: reviewNotes }
                });
            }

            setSelectedRequest(null);
            setReviewNotes('');
            loadRequests();
        } catch (error) {
            console.error('Approve error:', error);
            alert('Failed to approve verification');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (requestId: string) => {
        if (!reviewNotes.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Update verification request
            const { error: updateError } = await supabase
                .from('id_verification_requests')
                .update({
                    status: 'rejected',
                    notes: reviewNotes,
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Update profile verification status
            const request = requests.find(r => r.id === requestId);
            if (request) {
                await supabase
                    .from('profiles')
                    .update({
                        verification_status: 'rejected',
                        verification_notes: reviewNotes
                    })
                    .eq('id', request.user_id);

                // Log audit trail
                await supabase.from('verification_audit_log').insert({
                    user_id: request.user_id,
                    action: 'id_rejected',
                    details: { request_id: requestId, notes: reviewNotes }
                });
            }

            setSelectedRequest(null);
            setReviewNotes('');
            loadRequests();
        } catch (error) {
            console.error('Reject error:', error);
            alert('Failed to reject verification');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">ID Verification Requests</h1>
                <p className="text-gray-600">Review and approve user identity documents</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 font-medium transition border-b-2 ${filter === tab
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {requests.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600">No {filter !== 'all' ? filter : ''} verification requests</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.map((request) => (
                        <div
                            key={request.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                            onClick={() => setSelectedRequest(request)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{request.profiles?.full_name || 'Unknown'}</h3>
                                    <p className="text-sm text-gray-600">{request.profiles?.email}</p>
                                    <p className="text-xs text-gray-500 capitalize">{request.profiles?.role}</p>
                                </div>
                                {getStatusBadge(request.status)}
                            </div>

                            <div className="mb-3">
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Document:</span> {request.document_type.replace('_', ' ')}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Submitted: {new Date(request.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                                <img
                                    src={request.document_url}
                                    alt="ID Document"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Review ID Verification</h2>
                                    <p className="text-gray-600">{selectedRequest.profiles?.full_name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Document Preview */}
                            <div className="mb-6">
                                <img
                                    src={selectedRequest.document_url}
                                    alt="ID Document"
                                    className="w-full rounded-lg border border-gray-200"
                                />
                                <a
                                    href={selectedRequest.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                                >
                                    Open in new tab ↗
                                </a>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-medium">{selectedRequest.profiles?.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Role</p>
                                    <p className="font-medium capitalize">{selectedRequest.profiles?.role}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Document Type</p>
                                    <p className="font-medium capitalize">{selectedRequest.document_type.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Submitted</p>
                                    <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Review Notes */}
                            {selectedRequest.status === 'pending' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Review Notes
                                    </label>
                                    <textarea
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="Add notes about this verification..."
                                    />
                                </div>
                            )}

                            {/* Existing Notes */}
                            {selectedRequest.notes && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-900 mb-1">Previous Notes</p>
                                    <p className="text-sm text-blue-700">{selectedRequest.notes}</p>
                                </div>
                            )}

                            {/* Actions */}
                            {selectedRequest.status === 'pending' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReject(selectedRequest.id)}
                                        disabled={processing}
                                        className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
                                    >
                                        {processing ? 'Processing...' : 'Reject'}
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedRequest.id)}
                                        disabled={processing}
                                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
                                    >
                                        {processing ? 'Processing...' : 'Approve'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
