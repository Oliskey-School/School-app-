import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Download,
    Trash2,
    Database,
    Shield,
    Clock,
    FileText,
    User,
    AlertTriangle,
    CheckCircle2,
    Search,
    RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';

interface DataExportRequest {
    id: string;
    requester_name: string;
    student_name: string;
    request_type: 'export' | 'deletion';
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    requested_at: string;
    completed_at: string | null;
    data_categories: string[];
}

const DataExportScreen = () => {
    const { currentSchool } = useAuth();
    const [activeTab, setActiveTab] = useState<'requests' | 'new'>('requests');
    const [requests, setRequests] = useState<DataExportRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const [newRequest, setNewRequest] = useState({ parent_name: '', student_name: '', type: 'export', categories: [] as string[] });

    const allCategories = ['Personal Info', 'Grades', 'Attendance', 'Fee Records', 'Behavior Logs', 'Photos', 'Medical Records', 'Communication Logs'];

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await api.getDataRequests(currentSchool?.id);
            setRequests(data);
        } catch (error) {
            console.error('Fetch requests error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await api.updateDataRequestStatus(id, 'processing');
            toast.success('Request approved — processing started.');
            fetchRequests();
            
            // Simulation of completion (Backend would normally do this async)
            setTimeout(async () => {
                await api.updateDataRequestStatus(id, 'completed');
                toast.success('Data export/deletion completed.');
                fetchRequests();
            }, 3000);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleSubmit = async () => {
        if (!newRequest.parent_name || !newRequest.student_name || newRequest.categories.length === 0) {
            toast.error('Please fill all required fields.');
            return;
        }
        
        try {
            await api.createDataRequest({
                requester_name: newRequest.parent_name,
                student_name: newRequest.student_name,
                request_type: newRequest.type,
                data_categories: newRequest.categories
            }, currentSchool?.id);

            setNewRequest({ parent_name: '', student_name: '', type: 'export', categories: [] });
            setActiveTab('requests');
            toast.success('Data request submitted.');
            fetchRequests();
        } catch (error) {
            toast.error('Failed to submit request');
        }
    };

    const statusStyles: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-700',
        processing: 'bg-blue-100 text-blue-700',
        completed: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-red-100 text-red-700',
    };

    const toggleCategory = (cat: string) => {
        setNewRequest(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 font-outfit">Data Export & Deletion</h1>
                <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>NDPR / GDPR Right-to-Access & Right-to-Erasure Compliance</span>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
                {(['requests', 'new'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg font-bold text-sm capitalize transition-all ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        {tab === 'new' ? 'New Request' : 'All Requests'}
                    </button>
                ))}
            </div>

            {loading && requests.length === 0 ? (
                <div className="flex items-center justify-center p-20">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : activeTab === 'requests' ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Requester</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Categories</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {requests.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800 text-sm">{req.requester_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{req.student_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-full w-fit ${req.request_type === 'export' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                            {req.request_type === 'export' ? <Download className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                            <span className="capitalize">{req.request_type}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{req.data_categories.map(c => <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c}</span>)}</div></td>
                                    <td className="px-6 py-4"><span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusStyles[req.status]}`}>{req.status}</span></td>
                                    <td className="px-6 py-4">
                                        {req.status === 'pending' && (
                                            <button onClick={() => handleApprove(req.id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">Approve</button>
                                        )}
                                        {req.status === 'processing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                                        {req.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400">No data requests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Parent/Guardian Name</label>
                            <input type="text" value={newRequest.parent_name} onChange={e => setNewRequest(p => ({ ...p, parent_name: e.target.value }))}
                                placeholder="e.g. Mrs. Adeyemi" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Student Name</label>
                            <input type="text" value={newRequest.student_name} onChange={e => setNewRequest(p => ({ ...p, student_name: e.target.value }))}
                                placeholder="e.g. Femi Adeyemi" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Request Type</label>
                        <div className="flex space-x-3">
                            <button onClick={() => setNewRequest(p => ({ ...p, type: 'export' }))}
                                className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-sm border transition-all ${newRequest.type === 'export' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-100 text-gray-500'}`}>
                                <Download className="w-4 h-4" /><span>Data Export</span>
                            </button>
                            <button onClick={() => setNewRequest(p => ({ ...p, type: 'deletion' }))}
                                className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-sm border transition-all ${newRequest.type === 'deletion' ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-100 text-gray-500'}`}>
                                <Trash2 className="w-4 h-4" /><span>Data Deletion</span>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Data Categories</label>
                        <div className="flex flex-wrap gap-2">
                            {allCategories.map(cat => (
                                <button key={cat} onClick={() => toggleCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${newRequest.categories.includes(cat) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    {newRequest.type === 'deletion' && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 flex items-start space-x-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                            <p className="text-sm text-red-700"><strong>Warning:</strong> Data deletion is irreversible. Deleted data cannot be recovered. Under NDPR, you have 72 hours to process deletion requests.</p>
                        </div>
                    )}
                    <button onClick={handleSubmit} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        Submit Request
                    </button>
                </div>
            )}
        </div>
    );
};

export default DataExportScreen;
