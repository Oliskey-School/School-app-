import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { UsersIcon, CheckCircleIcon, XCircleIcon } from '../../constants';

interface SubstituteRequest {
    id: number;
    date: string;
    period_number: number;
    subject: string;
    class_name: string;
    reason: string;
    status: string;
    original_teacher_name: string;
}

const SubstituteAssignment: React.FC = () => {
    const { profile } = useProfile();
    const [requests, setRequests] = useState<SubstituteRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) return;

            const { data, error } = await supabase
                .from('substitute_assignments')
                .select(`
          *,
          original_teacher:teachers!substitute_assignments_original_teacher_id_fkey(full_name)
        `)
                .eq('substitute_teacher_id', teacherData.id)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date');

            if (error) throw error;

            const formatted: SubstituteRequest[] = (data || []).map((r: any) => ({
                id: r.id,
                date: r.date,
                period_number: r.period_number,
                subject: r.subject,
                class_name: r.class_name,
                reason: r.reason,
                status: r.status,
                original_teacher_name: r.original_teacher?.full_name || 'Unknown'
            }));

            setRequests(formatted);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: number) => {
        try {
            const { error } = await supabase
                .from('substitute_assignments')
                .update({ status: 'Accepted' })
                .eq('id', id);

            if (error) throw error;
            toast.success('Assignment accepted');
            fetchRequests();
        } catch (error: any) {
            toast.error('Failed to accept');
        }
    };

    const handleDecline = async (id: number) => {
        try {
            const { error } = await supabase
                .from('substitute_assignments')
                .update({ status: 'Declined' })
                .eq('id', id);

            if (error) throw error;
            toast.success('Assignment declined');
            fetchRequests();
        } catch (error: any) {
            toast.error('Failed to decline');
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
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${req.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                                                req.status === 'Declined' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900">{req.subject} - {req.class_name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">Cover for: {req.original_teacher_name}</p>
                                    <p className="text-sm text-gray-600">
                                        📅 {new Date(req.date).toLocaleDateString()} | Period {req.period_number}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">Reason: {req.reason}</p>
                                </div>
                                {req.status === 'Pending' && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleAccept(req.id)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-1"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span>Accept</span>
                                        </button>
                                        <button
                                            onClick={() => handleDecline(req.id)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-1"
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
