import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Heart, User, TrendingUp, MessageCircle, CheckCircle } from 'lucide-react';

interface SponsorshipRequest {
    id: number;
    student_id: number;
    amount_needed: number;
    reason: string;
    priority: string;
    status: string;
    created_at: string;
    students?: {
        name: string;
        class: string;
        age: number;
    };
}

interface Sponsorship {
    id: number;
    sponsor_id: number;
    student_id: number;
    amount_committed: number;
    status: string;
    start_date: string;
    donors?: {
        donor_name: string;
    };
    students?: {
        name: string;
        class: string;
    };
}

const SponsorshipMatching: React.FC = () => {
    const [requests, setRequests] = useState<SponsorshipRequest[]>([]);
    const [activeSponsors hip, setActiveSponsorships] = useState<Sponsorship[]>([]);
    const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'create'>('requests');

    // Form states for creating request
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [amountNeeded, setAmountNeeded] = useState('');
    const [reason, setReason] = useState('');
    const [priority, setPriority] = useState('Medium');

    const [loading, setLoading] = useState(true);
    const [totalRequests, setTotalRequests] = useState(0);
    const [matchedStudents, setMatchedStudents] = useState(0);
    const [totalCommitted, setTotalCommitted] = useState(0);

    useEffect(() => {
        fetchRequests();
        fetchActiveSponsorships();
        fetchStudents();
        fetchStats();
    }, []);

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('sponsorship_requests')
                .select(`
          *,
          students (name, class, age)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (error: any) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveSponsorships = async () => {
        try {
            const { data, error } = await supabase
                .from('sponsorships')
                .select(`
          *,
          donors (donor_name),
          students (name, class)
        `)
                .eq('status', 'Active')
                .order('start_date', { ascending: false });

            if (error) throw error;
            setActiveSponsorships(data || []);
        } catch (error: any) {
            console.error('Error fetching sponsorships:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name, class')
                .order('name', { ascending: true });

            if (error) throw error;
            setStudents(data || []);
            if (data && data.length > 0) {
                setSelectedStudentId(data[0].id);
            }
        } catch (error: any) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchStats = async () => {
        try {
            // Total requests
            const { count: requestCount } = await supabase
                .from('sponsorship_requests')
                .select('*', { count: 'exact', head: true });
            setTotalRequests(requestCount || 0);

            // Matched students
            const { count: matchedCount } = await supabase
                .from('sponsorships')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Active');
            setMatchedStudents(matchedCount || 0);

            // Total committed
            const { data: sponsorData } = await supabase
                .from('sponsorships')
                .select('amount_committed')
                .eq('status', 'Active');

            const total = sponsorData?.reduce((sum, s) => sum + Number(s.amount_committed), 0) || 0;
            setTotalCommitted(total);
        } catch (error: any) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleCreateRequest = async () => {
        if (!selectedStudentId || !amountNeeded || !reason) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('sponsorship_requests')
                .insert({
                    student_id: selectedStudentId,
                    amount_needed: Number(amountNeeded),
                    reason,
                    priority,
                    status: 'Pending'
                });

            if (error) throw error;

            toast.success('Sponsorship request created! 🎯');
            resetForm();
            setActiveTab('requests');
            fetchRequests();
            fetchStats();
        } catch (error: any) {
            toast.error('Failed to create request');
            console.error(error);
        }
    };

    const resetForm = () => {
        setAmountNeeded('');
        setReason('');
        setPriority('Medium');
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Pending: 'bg-yellow-100 text-yellow-800',
            Matched: 'bg-green-100 text-green-800',
            Active: 'bg-blue-100 text-blue-800',
            Completed: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityColor = (priority: string) => {
        const colors: { [key: string]: string } = {
            Low: 'bg-gray-100 text-gray-700',
            Medium: 'bg-yellow-100 text-yellow-700',
            High: 'bg-orange-100 text-orange-700',
            Urgent: 'bg-red-100 text-red-700'
        };
        return colors[priority] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">💝 Student Sponsorship Matching</h1>
                <p className="text-rose-100">Connect donors with students in need</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-rose-100 rounded-lg">
                            <MessageCircle className="h-6 w-6 text-rose-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
                            <p className="text-sm text-gray-600">Total Requests</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{matchedStudents}</p>
                            <p className="text-sm text-gray-600">Matched Students</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">₦{totalCommitted.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Total Committed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'requests'
                            ? 'bg-rose-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Requests ({requests.length})
                </button>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'active'
                            ? 'bg-rose-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Active Sponsorships ({activeSponsorships.length})
                </button>
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'create'
                            ? 'bg-rose-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    + Create Request
                </button>
            </div>

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {requests.length === 0 ? (
                        <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No sponsorship requests</p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Student #{req.student_id}</h3>
                                        <p className="text-sm text-gray-600">{req.students?.class} • Age: {req.students?.age}</p>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(req.priority)}`}>
                                            {req.priority}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-1">Need:</p>
                                    <p className="text-gray-900">{req.reason}</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Amount Needed</p>
                                        <p className="text-2xl font-bold text-rose-600">₦{req.amount_needed.toLocaleString()}</p>
                                    </div>
                                    {req.status === 'Pending' && (
                                        <button className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold">
                                            Match Sponsor
                                        </button>
                                    )}
                                </div>

                                <div className="mt-3 text-xs text-gray-500">
                                    Created: {new Date(req.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Active Sponsorships Tab */}
            {activeTab === 'active' && (
                <div className="space-y-4">
                    {activeSponsorships.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No active sponsorships</p>
                        </div>
                    ) : (
                        activeSponsorships.map(sponsorship => (
                            <div key={sponsorship.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Anonymous Student</h3>
                                        <p className="text-sm text-gray-600">{sponsorship.students?.class}</p>
                                        <p className="text-sm text-rose-600 font-semibold mt-1">
                                            Sponsored by: {sponsorship.donors?.donor_name || 'Anonymous Donor'}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(sponsorship.status)}`}>
                                        {sponsorship.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Amount Committed</p>
                                        <p className="text-xl font-bold text-gray-900">₦{sponsorship.amount_committed.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Start Date</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(sponsorship.start_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
                                    🔒 <strong>Privacy Protected:</strong> Student identity kept anonymous in public-facing materials
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Request Tab */}
            {activeTab === 'create' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Sponsorship Request</h2>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Student *</label>
                            <select
                                value={selectedStudentId || ''}
                                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                            >
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.name} - {student.class}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">🔒 Student name will be kept anonymous to sponsors</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount Needed (₦) *</label>
                            <input
                                type="number"
                                value={amountNeeded}
                                onChange={(e) => setAmountNeeded(e.target.value)}
                                placeholder="e.g., 50000"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority Level</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Sponsorship *</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Describe the need (e.g., school fees, uniforms, learning materials, medical support)..."
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                            ></textarea>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-900">
                                <strong>⚠️ Privacy Note:</strong> Student names are anonymized in all public sponsorship materials. Only authorized admin staff can view student identities for verification purposes.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleCreateRequest}
                        className="w-full px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold transition-colors"
                    >
                        Create Sponsorship Request
                    </button>
                </div>
            )}
        </div>
    );
};

export default SponsorshipMatching;
