import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../../constants';

interface PermissionSlip {
    id: number;
    student_id: number;
    student_name?: string;
    event_type: string;
    event_name: string;
    event_date: string;
    event_location: string;
    status: string;
    requested_date: string;
    description: string;
}

const PermissionSlips: React.FC = () => {
    const { profile } = useProfile();
    const [slips, setSlips] = useState<PermissionSlip[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        student_id: 0,
        event_type: 'Field Trip',
        event_name: '',
        event_date: '',
        event_location: '',
        description: '',
        special_instructions: ''
    });
    const [loading, setLoading] = useState(true);
    const isParent = profile.role === 'Parent';

    useEffect(() => {
        fetchSlips();
        if (!isParent) fetchStudents();
    }, []);

    const fetchSlips = async () => {
        try {
            setLoading(true);
            let query = supabase.from('permission_slips').select('*, students(full_name)');

            if (isParent) {
                // Fetch slips for parent's children
                const { data: children } = await supabase
                    .from('students')
                    .select('id')
                    .eq('parent_id', profile.id);

                if (children && children.length > 0) {
                    query = query.in('student_id', children.map(c => c.id));
                }
            }

            const { data, error } = await query.order('requested_date', { ascending: false });
            if (error) throw error;

            const formatted = (data || []).map((s: any) => ({
                ...s,
                student_name: s.students?.full_name || 'Unknown'
            }));

            setSlips(formatted);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from('students').select('id, full_name').order('full_name');
        setStudents(data || []);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('permission_slips').insert({
                ...formData,
                requested_by: user.id,
                status: 'Pending'
            });

            if (error) throw error;

            toast.success('Permission slip created successfully!');
            setShowCreate(false);
            setFormData({
                student_id: 0,
                event_type: 'Field Trip',
                event_name: '',
                event_date: '',
                event_location: '',
                description: '',
                special_instructions: ''
            });
            fetchSlips();
        } catch (error: any) {
            toast.error('Failed to create permission slip');
        }
    };

    const handleSign = async (slipId: number) => {
        try {
            const { error } = await supabase
                .from('permission_slips')
                .update({
                    status: 'Parent Approved',
                    parent_signed_at: new Date().toISOString(),
                    parent_signature_url: 'DIGITAL_SIGNATURE'
                })
                .eq('id', slipId);

            if (error) throw error;
            toast.success('Permission slip signed!');
            fetchSlips();
        } catch (error: any) {
            toast.error('Failed to sign slip');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Parent Approved': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Permission Slips</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {isParent ? 'Review and sign permission slips' : 'Manage student permission slips'}
                    </p>
                </div>
                {!isParent && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Create Permission Slip
                    </button>
                )}
            </div>

            {/* Slips List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : slips.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No permission slips</p>
                    </div>
                ) : (
                    slips.map((slip) => (
                        <div key={slip.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(slip.status)}`}>
                                            {slip.status}
                                        </span>
                                        <span className="text-sm text-gray-600">{slip.event_type}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{slip.event_name}</h3>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <strong>Student:</strong> {slip.student_name}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <strong>Date:</strong> {new Date(slip.event_date).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <strong>Location:</strong> {slip.event_location}
                                    </p>
                                    {slip.description && (
                                        <p className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded">
                                            {slip.description}
                                        </p>
                                    )}
                                </div>
                                {isParent && slip.status === 'Pending' && (
                                    <div className="flex flex-col space-y-2">
                                        <button
                                            onClick={() => handleSign(slip.id)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center space-x-1"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span>Sign & Approve</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Create Permission Slip</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Student *
                                </label>
                                <select
                                    required
                                    value={formData.student_id}
                                    onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value={0}>Select student</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Event Type *
                                    </label>
                                    <select
                                        value={formData.event_type}
                                        onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option>Field Trip</option>
                                        <option>Sports Event</option>
                                        <option>Excursion</option>
                                        <option>Medical Treatment</option>
                                        <option>Media Release</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Event Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.event_date}
                                        onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Event Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.event_name}
                                    onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                                    placeholder="e.g., Trip to National Museum"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.event_location}
                                    onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                ></textarea>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    Create Slip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionSlips;
