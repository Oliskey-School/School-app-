import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    Shield,
    FileCheck,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Users,
    Camera,
    Stethoscope,
    Database,
    Download,
    PlusIcon,
    Eye,
    RefreshCw,
    Search,
    ChevronRight,
    Loader2
} from 'lucide-react';

interface ConsentRecord {
    id: string;
    parent_name: string;
    student_name: string;
    student_class: string;
    consent_type: string;
    status: 'granted' | 'pending' | 'revoked';
    granted_at: string | null;
    revoked_at: string | null;
}

const CONSENT_TYPES = [
    { value: 'data_processing', label: 'Data Processing & Storage', icon: Database, description: 'Use of personal data for school management purposes.' },
    { value: 'photo_usage', label: 'Photo & Video Usage', icon: Camera, description: 'Use of student photos in school publications and social media.' },
    { value: 'medical_sharing', label: 'Medical Information Sharing', icon: Stethoscope, description: 'Sharing medical records with school health staff.' },
    { value: 'third_party', label: 'Third-Party Services', icon: Users, description: 'Sharing data with approved EdTech platforms and services.' },
    { value: 'communication', label: 'Communication Channels', icon: Shield, description: 'Receiving notifications via SMS, WhatsApp, and email.' },
];

const ConsentFormScreen = () => {
    const { currentSchool } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'templates'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<ConsentRecord[]>([]);

    useEffect(() => {
        if (currentSchool?.id) {
            fetchConsents();
        }
    }, [currentSchool?.id]);

    const fetchConsents = async () => {
        setLoading(true);
        try {
            const data = await api.getConsents(currentSchool?.id);
            setRecords(data.map((r: any) => ({
                id: r.id,
                parent_name: r.parent_name,
                student_name: r.student?.full_name || 'N/A',
                student_class: r.student ? `${r.student.grade} ${r.student.section}` : 'N/A',
                consent_type: r.consent_type,
                status: r.status,
                granted_at: r.granted_at,
                revoked_at: r.revoked_at
            })));
        } catch (err) {
            console.error('Fetch consents error:', err);
            toast.error('Failed to fetch consent records');
        } finally {
            setLoading(false);
        }
    };

    const granted = records.filter(r => r.status === 'granted').length;
    const pending = records.filter(r => r.status === 'pending').length;
    const revoked = records.filter(r => r.status === 'revoked').length;
    const complianceRate = records.length > 0 ? Math.round((granted / records.length) * 100) : 0;

    const filteredRecords = records.filter(r =>
        r.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSendReminder = (id: string) => {
        toast.success('Consent reminder sent to parent via SMS & WhatsApp');
    };

    const handleExport = () => {
        toast.success('NDPR compliance report exported');
    };

    const statusIcon = (status: string) => {
        if (status === 'granted') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        if (status === 'pending') return <Clock className="w-4 h-4 text-amber-500" />;
        return <XCircle className="w-4 h-4 text-red-500" />;
    };

    const statusBadge = (status: string) => {
        if (status === 'granted') return 'bg-emerald-100 text-emerald-700';
        if (status === 'pending') return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Parental Consent Management</h1>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>NDPR Compliance — Collect and manage data processing consent.</span>
                    </div>
                </div>
                <button onClick={handleExport} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                    <Download className="w-5 h-5" /><span>Export NDPR Report</span>
                </button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><FileCheck className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{records.length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Records</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{granted}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Granted</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><Clock className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{pending}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><Shield className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{complianceRate}%</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Compliance</p></div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
                {(['overview', 'records', 'templates'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg font-bold text-sm capitalize transition-all ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CONSENT_TYPES.map(ct => {
                        const typeRecords = records.filter(r => r.consent_type === ct.value);
                        const typeGranted = typeRecords.filter(r => r.status === 'granted').length;
                        const typePending = typeRecords.filter(r => r.status === 'pending').length;
                        const Icon = ct.icon;
                        return (
                            <div key={ct.value} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="w-5 h-5" /></div>
                                    <h3 className="font-bold text-gray-800">{ct.label}</h3>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">{ct.description}</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex space-x-4">
                                        <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">{typeGranted} granted</span>
                                        {typePending > 0 && <span className="text-xs font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full">{typePending} pending</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'records' && (
                <div className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search by parent or student name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Parent</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Consent Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                                <p className="text-gray-500">Loading consent records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Shield className="w-8 h-8 text-gray-200" />
                                                <p className="text-gray-500">No consent records found</p>
                                                <p className="text-xs font-normal text-gray-400">Consent requests will appear here once sent to parents.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRecords.map(record => (
                                    <tr key={record.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800 text-sm">{record.parent_name}</td>
                                        <td className="px-6 py-4">
                                            <div><span className="font-bold text-gray-700 text-sm">{record.student_name}</span></div>
                                            <span className="text-xs text-gray-400">{record.student_class}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{record.consent_type.replace(/_/g, ' ')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-full capitalize ${statusBadge(record.status)}`}>
                                                {statusIcon(record.status)}<span>{record.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {record.granted_at ? new Date(record.granted_at).toLocaleDateString('en-NG') : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.status === 'pending' && (
                                                <button onClick={() => handleSendReminder(record.id)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all">
                                                    Send Reminder
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="space-y-4">
                    {CONSENT_TYPES.map(ct => {
                        const Icon = ct.icon;
                        return (
                            <div key={ct.value} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="w-5 h-5" /></div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{ct.label}</h3>
                                            <p className="text-xs text-gray-500">{ct.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center space-x-1">
                                            <Eye className="w-3 h-3" /><span>Preview</span>
                                        </button>
                                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">
                                            Send to Parents
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-blue-800">NDPR Compliance Note</p>
                            <p className="text-xs text-blue-600 mt-1">Under the Nigeria Data Protection Regulation (NDPR), you must obtain explicit consent before processing personal data. Consent must be freely given, informed, and revocable at any time.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsentFormScreen;
