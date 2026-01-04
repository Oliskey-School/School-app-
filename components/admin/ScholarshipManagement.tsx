import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Award, Users, DollarSign, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface Scholarship {
    id: number;
    scholarship_name: string;
    description: string;
    amount: number;
    currency: string;
    scholarship_type: string;
    eligibility_criteria: string;
    application_deadline: string;
    slots_available: number;
    slots_filled: number;
    is_active: boolean;
    is_renewable: boolean;
}

interface Application {
    id: number;
    scholarship_id: number;
    student_id: number;
    status: string;
    applied_date: string;
    review_notes: string;
    students?: {
        name: string;
        class: string;
    };
    scholarships?: {
        scholarship_name: string;
        amount: number;
    };
}

const ScholarshipManagement: React.FC = () => {
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [recipients, setRecipients] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'scholarships' | 'applications' | 'recipients'>('scholarships');

    // Form states
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [scholarshipName, setScholarshipName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [scholarshipType, setScholarshipType] = useState('Merit-Based');
    const [eligibilityCriteria, setEligibilityCriteria] = useState('');
    const [applicationDeadline, setApplicationDeadline] = useState('');
    const [slotsAvailable, setSlotsAvailable] = useState('');
    const [isRenewable, setIsRenewable] = useState(false);

    const [loading, setLoading] = useState(true);
    const [totalScholarships, setTotalScholarships] = useState(0);
    const [totalAwarded, setTotalAwarded] = useState(0);
    const [pendingApplications, setPendingApplications] = useState(0);

    useEffect(() => {
        fetchScholarships();
        fetchApplications();
        fetchRecipients();
        fetchStats();
    }, []);

    const fetchScholarships = async () => {
        try {
            const { data, error } = await supabase
                .from('scholarships')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setScholarships(data || []);
        } catch (error: any) {
            console.error('Error fetching scholarships:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchApplications = async () => {
        try {
            const { data, error } = await supabase
                .from('scholarship_applications')
                .select(`
          *,
          students (name, class),
          scholarships (scholarship_name, amount)
        `)
                .order('applied_date', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error: any) {
            console.error('Error fetching applications:', error);
        }
    };

    const fetchRecipients = async () => {
        try {
            const { data, error } = await supabase
                .from('scholarship_recipients')
                .select(`
          *,
          students (name, class),
          scholarships (scholarship_name, amount)
        `)
                .order('award_date', { ascending: false });

            if (error) throw error;
            setRecipients(data || []);
        } catch (error: any) {
            console.error('Error fetching recipients:', error);
        }
    };

    const fetchStats = async () => {
        try {
            // Total scholarships
            const { count: totalCount } = await supabase
                .from('scholarships')
                .select('*', { count: 'exact', head: true });
            setTotalScholarships(totalCount || 0);

            // Total awarded
            const { count: awardedCount } = await supabase
                .from('scholarship_recipients')
                .select('*', { count: 'exact', head: true });
            setTotalAwarded(awardedCount || 0);

            // Pending applications
            const { count: pendingCount } = await supabase
                .from('scholarship_applications')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Pending');
            setPendingApplications(pendingCount || 0);
        } catch (error: any) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleCreateScholarship = async () => {
        if (!scholarshipName || !amount || !applicationDeadline) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('scholarships')
                .insert({
                    scholarship_name: scholarshipName,
                    description,
                    amount: Number(amount),
                    currency: 'NGN',
                    scholarship_type: scholarshipType,
                    eligibility_criteria: eligibilityCriteria,
                    application_deadline: applicationDeadline,
                    slots_available: Number(slotsAvailable) || 1,
                    slots_filled: 0,
                    is_active: true,
                    is_renewable: isRenewable
                });

            if (error) throw error;

            toast.success('Scholarship created successfully! 🎓');
            resetForm();
            setShowCreateForm(false);
            fetchScholarships();
        } catch (error: any) {
            toast.error('Failed to create scholarship');
            console.error(error);
        }
    };

    const handleApproveApplication = async (applicationId: number, scholarshipId: number, studentId: number) => {
        try {
            // Update application status
            await supabase
                .from('scholarship_applications')
                .update({ status: 'Approved' })
                .eq('id', applicationId);

            // Create recipient record
            await supabase
                .from('scholarship_recipients')
                .insert({
                    scholarship_id: scholarshipId,
                    student_id: studentId,
                    award_date: new Date().toISOString().split('T')[0],
                    status: 'Active'
                });

            // Update scholarship slots
            const scholarship = scholarships.find(s => s.id === scholarshipId);
            if (scholarship) {
                await supabase
                    .from('scholarships')
                    .update({ slots_filled: scholarship.slots_filled + 1 })
                    .eq('id', scholarshipId);
            }

            toast.success('Application approved! 🎉');
            fetchApplications();
            fetchRecipients();
            fetchScholarships();
            fetchStats();
        } catch (error: any) {
            toast.error('Failed to approve application');
            console.error(error);
        }
    };

    const handleRejectApplication = async (applicationId: number) => {
        try {
            await supabase
                .from('scholarship_applications')
                .update({ status: 'Rejected' })
                .eq('id', applicationId);

            toast.success('Application rejected');
            fetchApplications();
            fetchStats();
        } catch (error: any) {
            toast.error('Failed to reject application');
            console.error(error);
        }
    };

    const resetForm = () => {
        setScholarshipName('');
        setDescription('');
        setAmount('');
        setScholarshipType('Merit-Based');
        setEligibilityCriteria('');
        setApplicationDeadline('');
        setSlotsAvailable('');
        setIsRenewable(false);
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Pending: 'bg-yellow-100 text-yellow-800',
            Approved: 'bg-green-100 text-green-800',
            Rejected: 'bg-red-100 text-red-800',
            Active: 'bg-blue-100 text-blue-800',
            Completed: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">🎓 Scholarship Management</h1>
                <p className="text-amber-100">Support students through education funding</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <Award className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalScholarships}</p>
                            <p className="text-sm text-gray-600">Total Scholarships</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Users className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalAwarded}</p>
                            <p className="text-sm text-gray-600">Students Awarded</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{pendingApplications}</p>
                            <p className="text-sm text-gray-600">Pending Applications</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('scholarships')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'scholarships'
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Scholarships ({scholarships.length})
                </button>
                <button
                    onClick={() => setActiveTab('applications')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'applications'
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Applications ({applications.length})
                </button>
                <button
                    onClick={() => setActiveTab('recipients')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'recipients'
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Recipients ({recipients.length})
                </button>
            </div>

            {/* Scholarships Tab */}
            {activeTab === 'scholarships' && (
                <div className="space-y-6">
                    {!showCreateForm && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="w-full px-6 py-4 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-bold transition-colors"
                        >
                            + Create New Scholarship
                        </button>
                    )}

                    {showCreateForm && (
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Scholarship</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Scholarship Name *</label>
                                    <input
                                        type="text"
                                        value={scholarshipName}
                                        onChange={(e) => setScholarshipName(e.target.value)}
                                        placeholder="e.g., Excellence Award 2026"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                                    <select
                                        value={scholarshipType}
                                        onChange={(e) => setScholarshipType(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option>Merit-Based</option>
                                        <option>Need-Based</option>
                                        <option>Sports</option>
                                        <option>Arts</option>
                                        <option>Leadership</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₦) *</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="50000"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Slots Available</label>
                                    <input
                                        type="number"
                                        value={slotsAvailable}
                                        onChange={(e) => setSlotsAvailable(e.target.value)}
                                        placeholder="10"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the scholarship..."
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    ></textarea>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Eligibility Criteria</label>
                                    <textarea
                                        value={eligibilityCriteria}
                                        onChange={(e) => setEligibilityCriteria(e.target.value)}
                                        placeholder="e.g., Minimum 70% average, Good conduct..."
                                        rows={2}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Application Deadline *</label>
                                    <input
                                        type="date"
                                        value={applicationDeadline}
                                        onChange={(e) => setApplicationDeadline(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="renewable"
                                        checked={isRenewable}
                                        onChange={(e) => setIsRenewable(e.target.checked)}
                                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                    />
                                    <label htmlFor="renewable" className="ml-2 text-sm text-gray-700">Renewable scholarship</label>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateScholarship}
                                    className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold"
                                >
                                    Create Scholarship
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scholarships.map(scholarship => (
                            <div key={scholarship.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900">{scholarship.scholarship_name}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${scholarship.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {scholarship.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-3">{scholarship.description}</p>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Amount:</span>
                                        <span className="font-bold text-lg text-amber-600">₦{scholarship.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Type:</span>
                                        <span className="font-semibold text-gray-900">{scholarship.scholarship_type}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Slots:</span>
                                        <span className="font-semibold text-gray-900">{scholarship.slots_filled}/{scholarship.slots_available}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Deadline:</span>
                                        <span className="font-semibold text-gray-900">{new Date(scholarship.application_deadline).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {scholarship.is_renewable && (
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                        Renewable
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
                <div className="space-y-4">
                    {applications.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No applications yet</p>
                        </div>
                    ) : (
                        applications.map(app => (
                            <div key={app.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{app.students?.name}</h3>
                                        <p className="text-sm text-gray-600">{app.students?.class} • Applied: {new Date(app.applied_date).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>
                                        {app.status}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm font-semibold text-gray-700">Scholarship:</p>
                                    <p className="text-gray-900">{app.scholarships?.scholarship_name} - ₦{app.scholarships?.amount.toLocaleString()}</p>
                                </div>

                                {app.status === 'Pending' && (
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => handleApproveApplication(app.id, app.scholarship_id, app.student_id)}
                                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center space-x-2"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Approve</span>
                                        </button>
                                        <button
                                            onClick={() => handleRejectApplication(app.id)}
                                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center space-x-2"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            <span>Reject</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Recipients Tab */}
            {activeTab === 'recipients' && (
                <div className="space-y-4">
                    {recipients.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No recipients yet</p>
                        </div>
                    ) : (
                        recipients.map(recipient => (
                            <div key={recipient.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{recipient.students?.name}</h3>
                                        <p className="text-sm text-gray-600">{recipient.students?.class}</p>
                                        <p className="text-sm font-semibold text-amber-600 mt-2">{recipient.scholarships?.scholarship_name}</p>
                                        <p className="text-lg font-bold text-gray-900">₦{recipient.scholarships?.amount.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(recipient.status)}`}>
                                            {recipient.status}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-2">Awarded: {new Date(recipient.award_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ScholarshipManagement;
