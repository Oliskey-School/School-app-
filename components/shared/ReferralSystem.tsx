import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { User, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface Referral {
    id: number;
    referral_type: string;
    need_description: string;
    urgency: string;
    status: string;
    is_confidential: boolean;
    created_at: string;
    students?: {
        name: string;
    };
    community_resources?: {
        resource_name: string;
    };
}

const ReferralSystem: React.FC = () => {
    const { profile } = useProfile();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);

    // Form states
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [referralType, setReferralType] = useState('Health');
    const [needDescription, setNeedDescription] = useState('');
    const [urgency, setUrgency] = useState('Medium');
    const [isConfidential, setIsConfidential] = useState(true);

    const [loading, setLoading] = useState(true);

    const urgencyColors: { [key: string]: string } = {
        Low: 'bg-gray-100 text-gray-800',
        Medium: 'bg-yellow-100 text-yellow-800',
        High: 'bg-orange-100 text-orange-800',
        Critical: 'bg-red-100 text-red-800 animate-pulse'
    };

    const statusColors: { [key: string]: string } = {
        Submitted: 'bg-blue-100 text-blue-800',
        'Under Review': 'bg-purple-100 text-purple-800',
        Matched: 'bg-green-100 text-green-800',
        'In Progress': 'bg-indigo-100 text-indigo-800',
        Resolved: 'bg-gray-100 text-gray-800',
        Closed: 'bg-gray-100 text-gray-600'
    };

    useEffect(() => {
        fetchStudents();
        fetchReferrals();
    }, []);

    const fetchStudents = async () => {
        try {
            // For parents - get their children
            // For admin/teachers - would need different logic
            const { data, error } = await supabase
                .from('students')
                .select('id, name')
                .eq('parent_id', profile.id);

            if (error) throw error;
            setStudents(data || []);
            if (data && data.length > 0) {
                setSelectedStudentId(data[0].id);
            }
        } catch (error: any) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchReferrals = async () => {
        try {
            const { data, error } = await supabase
                .from('family_referrals')
                .select(`
          *,
          students (name),
          community_resources (resource_name)
        `)
                .eq('parent_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReferrals(data || []);
        } catch (error: any) {
            console.error('Error fetching referrals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReferral = async () => {
        if (!selectedStudentId || !needDescription) {
            toast.error('Please select a student and describe the need');
            return;
        }

        try {
            const { error } = await supabase
                .from('family_referrals')
                .insert({
                    student_id: selectedStudentId,
                    parent_id: profile.id,
                    submitted_by: profile.id,
                    referral_type: referralType,
                    need_description: needDescription,
                    urgency,
                    status: 'Submitted',
                    is_confidential: isConfidential
                });

            if (error) throw error;

            toast.success('Referral submitted successfully! A social worker will review it soon.');
            resetForm();
            setShowForm(false);
            fetchReferrals();
        } catch (error: any) {
            toast.error('Failed to submit referral');
            console.error(error);
        }
    };

    const resetForm = () => {
        setReferralType('Health');
        setNeedDescription('');
        setUrgency('Medium');
        setIsConfidential(true);
    };

    const getUrgencyIcon = (urgency: string) => {
        switch (urgency) {
            case 'Critical':
                return <AlertCircle className="h-5 w-5" />;
            case 'High':
                return <AlertCircle className="h-5 w-5" />;
            default:
                return <Clock className="h-5 w-5" />;
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">🤝 Family Referral System</h1>
                <p className="text-indigo-100">Get connected to community support services</p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-900">
                            <strong>Confidential Support:</strong> This referral system connects you with local resources for health, food, legal aid, and more. All referrals are confidential and reviewed by trained staff.
                        </p>
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-lg mb-6 transition-colors"
                >
                    + Submit New Referral
                </button>
            )}

            {/* Referral Form */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">New Referral Request</h2>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Student*</label>
                            <select
                                value={selectedStudentId || ''}
                                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>{student.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Type of Need*</label>
                            <select
                                value={referralType}
                                onChange={(e) => setReferralType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option>Health</option>
                                <option>Food</option>
                                <option>Shelter</option>
                                <option>Legal</option>
                                <option>Counseling</option>
                                <option>Financial</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency Level*</label>
                            <select
                                value={urgency}
                                onChange={(e) => setUrgency(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Describe the Need*</label>
                            <textarea
                                value={needDescription}
                                onChange={(e) => setNeedDescription(e.target.value)}
                                placeholder="Please describe the situation and what support is needed..."
                                rows={5}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1">Be as detailed as possible to help us match you with the right resources</p>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="confidential"
                                checked={isConfidential}
                                onChange={(e) => setIsConfidential(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="confidential" className="ml-2 text-sm text-gray-700">
                                Keep this referral confidential  (recommended)
                            </label>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }}
                            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitReferral}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                        >
                            Submit Referral
                        </button>
                    </div>
                </div>
            )}

            {/* My Referrals */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">My Referrals ({referrals.length})</h2>

                {referrals.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg">No referrals submitted yet</p>
                        <p className="text-sm">Click "Submit New Referral" to get started</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {referrals.map(referral => (
                            <div key={referral.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <h3 className="text-lg font-bold text-gray-900">{referral.referral_type}</h3>
                                            {referral.is_confidential && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                                                    🔒 Confidential
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">Student: {referral.students?.name}</p>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[referral.status]}`}>
                                            {referral.status}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${urgencyColors[referral.urgency]}`}>
                                            {getUrgencyIcon(referral.urgency)}
                                            <span>{referral.urgency}</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg mb-3">
                                    <p className="text-sm text-gray-700">{referral.need_description}</p>
                                </div>

                                {referral.community_resources && (
                                    <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Matched with: <strong>{referral.community_resources.resource_name}</strong></span>
                                    </div>
                                )}

                                <div className="mt-3 text-xs text-gray-500">
                                    Submitted: {new Date(referral.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralSystem;
