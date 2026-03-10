import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Activity,
    ShieldCheck,
    Flame,
    PlusIcon,
    FileText,
    Search,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Clock,
    User,
    UploadCloud,
    ChevronLeft
} from 'lucide-react';

type TabType = 'incidents' | 'drills' | 'safeguarding';

interface Incident {
    id: string;
    school_id: string;
    incident_type: string;
    severity: string;
    description: string;
    action_taken: string;
    incident_date: string;
    parent_notified: boolean;
    student_id: string;
    students?: { name: string };
}

interface Drill {
    id: string;
    school_id: string;
    drill_type: string;
    drill_date: string;
    duration_minutes: number;
    participants_count: number;
    success_rating: string;
    notes: string;
}

interface Policy {
    id: string;
    school_id: string;
    title: string;
    version: string;
    effective_date: string;
    document_url: string;
}

// --- Standalone Sub-components (outside main component to prevent focus loss) ---

interface AddEntryFormProps {
    activeTab: TabType;
    formData: any;
    setFormData: (data: any) => void;
    students: { id: string, name: string }[];
    loading: boolean;
    handleSave: () => void;
    setIsAdding: (val: boolean) => void;
}

const AddEntryForm = ({
    activeTab,
    formData,
    setFormData,
    students,
    loading,
    handleSave,
    setIsAdding
}: AddEntryFormProps) => (
    <div className="bg-white rounded-[2.5rem] p-8 w-full shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center space-x-4 mb-8">
            <button
                onClick={() => {
                    setIsAdding(false);
                    setFormData({});
                }}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all group"
            >
                <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
                <h3 className="text-2xl font-bold text-gray-900 font-outfit">
                    {activeTab === 'incidents' ? 'Log Health Incident' :
                        activeTab === 'drills' ? 'Record Emergency Drill' : 'Upload Safeguarding Policy'}
                </h3>
                <p className="text-sm text-gray-500">Fill in the details below</p>
            </div>
        </div>

        <div className="space-y-6 max-w-2xl">
            {activeTab === 'incidents' && (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Student <span className="text-red-500">*</span></label>
                        <select
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            value={formData.student_id || ''}
                        >
                            <option value="">Select Student</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Incident Type <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="e.g., Minor Injury, Fever"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.incident_type || ''}
                            onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Description</label>
                        <textarea
                            placeholder="What happened?"
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                value={formData.incident_date || ''}
                                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Time</label>
                            <input
                                type="time"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                value={formData.incident_time || ''}
                                onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Severity</label>
                        <select
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.severity || 'Minor'}
                            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                        >
                            <option value="Minor">Minor</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Severe">Severe</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Action Taken</label>
                        <textarea
                            placeholder="Describe treatment or steps taken..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.action_taken || ''}
                            onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center space-x-3 ml-1">
                        <input
                            type="checkbox"
                            id="parentNotified"
                            className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            checked={formData.parent_notified || false}
                            onChange={(e) => setFormData({ ...formData, parent_notified: e.target.checked })}
                        />
                        <label htmlFor="parentNotified" className="text-sm font-bold text-gray-700">Parent Notified</label>
                    </div>
                </>
            )}

            {activeTab === 'drills' && (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Drill Type <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="e.g., Fire, Lockdown"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.drill_type || ''}
                            onChange={(e) => setFormData({ ...formData, drill_type: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                value={formData.drill_date || ''}
                                onChange={(e) => setFormData({ ...formData, drill_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Duration (Mins)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                value={formData.duration_minutes || ''}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Participants Count</label>
                        <input
                            type="number"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.participants_count || ''}
                            onChange={(e) => setFormData({ ...formData, participants_count: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Success Rating</label>
                        <select
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.success_rating || 'Good'}
                            onChange={(e) => setFormData({ ...formData, success_rating: e.target.value })}
                        >
                            <option value="Excellent">Excellent</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Needs Improvement">Needs Improvement</option>
                        </select>
                    </div>
                </>
            )}

            {activeTab === 'safeguarding' && (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Policy Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="e.g., Child Protection Policy"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.title || ''}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Version</label>
                            <input
                                type="text"
                                placeholder="1.0"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                value={formData.version || ''}
                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Effective Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                                value={formData.effective_date || ''}
                                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Document URL <span className="text-red-500">*</span></label>
                        <input
                            type="url"
                            placeholder="https://..."
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium"
                            value={formData.document_url || ''}
                            onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                        />
                    </div>
                </>
            )}
        </div>

        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 mt-12 max-w-2xl">
            <button
                onClick={() => {
                    setIsAdding(false);
                    setFormData({});
                }}
                className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                disabled={loading}
            >
                Cancel
            </button>
            <button
                onClick={handleSave}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50"
                disabled={loading}
            >
                {loading ? 'Saving...' : 'Save Record'}
            </button>
        </div>
    </div>
);

interface IncidentTabProps {
    incidents: Incident[];
    setIsAdding: (val: boolean) => void;
}

const IncidentTab = ({ incidents, setIsAdding }: IncidentTabProps) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search incidents..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <button onClick={() => setIsAdding(true)} className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100">
                <PlusIcon className="w-5 h-5" />
                <span>Log Incident</span>
            </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {incidents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Activity className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">No health incidents recorded yet.</p>
                </div>
            ) : (
                incidents.map(inc => (
                    <div key={inc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-4 hover:shadow-md transition-shadow">
                        <div className={`p-3 rounded-full ${inc.severity === 'Critical' ? 'bg-red-100 text-red-600' :
                            inc.severity === 'Severe' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-grow">
                            <div className="flex justify-between">
                                <h3 className="font-bold text-gray-900">{inc.incident_type} - {inc.students?.name || 'Unknown Student'}</h3>
                                <span className="text-xs font-bold text-gray-400">{new Date(inc.incident_date).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{inc.description}</p>
                            <div className="flex items-center space-x-4 mt-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inc.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                    }`}>{inc.severity}</span>
                                {inc.parent_notified && (
                                    <div className="flex items-center space-x-1 text-green-600">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">Parent Notified</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
);

interface DrillTabProps {
    drills: Drill[];
    setIsAdding: (val: boolean) => void;
}

const DrillTab = ({ drills, setIsAdding }: DrillTabProps) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-700">Emergency Drill Records</h2>
            <button onClick={() => setIsAdding(true)} className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-700 transition-colors">
                <Flame className="w-5 h-5" />
                <span>Record Drill</span>
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drills.map(drill => (
                <div key={drill.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                            <Flame className="w-6 h-6" />
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${drill.success_rating === 'Excellent' || drill.success_rating === 'Good' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {drill.success_rating}
                        </span>
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">{drill.drill_type} Drill</h3>
                        <div className="flex items-center space-x-2 text-gray-400 text-xs mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(drill.drill_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400">Duration</p>
                            <p className="font-bold text-gray-700">{drill.duration_minutes} mins</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400">Participants</p>
                            <p className="font-bold text-gray-700">{drill.participants_count}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

interface PolicyTabProps {
    policies: Policy[];
    setIsAdding: (val: boolean) => void;
}

const PolicyTab = ({ policies, setIsAdding }: PolicyTabProps) => (
    <div className="space-y-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold font-outfit">Safeguarding Policies</h2>
                <p className="text-indigo-100 opacity-80">Manage institutional child protection standards and guidelines.</p>
            </div>
            <button onClick={() => setIsAdding(true)} className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-bold shadow-xl hover:bg-gray-50 transition-all flex items-center space-x-2 group">
                <UploadCloud className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Upload Policy</span>
            </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Policy Title</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Version</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Effective Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {policies.map(policy => (
                        <tr key={policy.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <FileText className="w-5 h-5 text-indigo-500" />
                                    <span className="font-bold text-gray-800">{policy.title}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-500">v{policy.version}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-600">{new Date(policy.effective_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                                <a
                                    href={policy.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
                                >
                                    Download
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const SafetyHealthLogs = () => {
    const { currentSchool, currentBranchId } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('incidents');
    const [loading, setLoading] = useState(true);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [students, setStudents] = useState<{ id: string, name: string }[]>([]);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (currentSchool) {
            fetchData();
        }
    }, [activeTab, currentSchool]);

    const fetchData = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            if (activeTab === 'incidents') {
                const { data } = await supabase
                    .from('health_incident_logs')
                    .select('*, students(name)')
                    .eq('school_id', currentSchool.id)
                    .order('incident_date', { ascending: false });
                if (data) setIncidents(data);

                const studentsData = await api.getStudents(currentSchool.id, currentBranchId || undefined, { includeUntagged: true });
                if (studentsData) setStudents((studentsData || []).map((s: any) => ({ id: s.id, name: s.name })));
            } else if (activeTab === 'drills') {
                const { data } = await supabase
                    .from('emergency_drills')
                    .select('*')
                    .eq('school_id', currentSchool.id)
                    .order('drill_date', { ascending: false });
                if (data) setDrills(data);
            } else if (activeTab === 'safeguarding') {
                const { data } = await supabase
                    .from('safeguarding_policies')
                    .select('*')
                    .eq('school_id', currentSchool.id)
                    .order('effective_date', { ascending: false });
                if (data) setPolicies(data);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load safety logs');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            let table = '';
            let data = { ...formData, school_id: currentSchool.id };

            // Validation
            if (activeTab === 'incidents') {
                if (!formData.student_id || !formData.incident_type || !formData.incident_date || !formData.severity) {
                    toast.error('Please fill in all required fields marked with *');
                    setLoading(false);
                    return;
                }
                table = 'health_incident_logs';
            } else if (activeTab === 'drills') {
                if (!formData.drill_type || !formData.drill_date) {
                    toast.error('Please fill in all required fields marked with *');
                    setLoading(false);
                    return;
                }
                table = 'emergency_drills';
            } else if (activeTab === 'safeguarding') {
                if (!formData.title || !formData.effective_date || !formData.document_url) {
                    toast.error('Please fill in all required fields marked with *');
                    setLoading(false);
                    return;
                }
                table = 'safeguarding_policies';
            }

            const { error } = await supabase.from(table).insert(data);
            if (error) throw error;

            toast.success('Record saved successfully');
            setIsAdding(false);
            setFormData({});
            fetchData();
        } catch (error: any) {
            console.error('Error saving record:', error);
            toast.error(error.message || 'Failed to save record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {isAdding ? (
                <AddEntryForm
                    activeTab={activeTab}
                    formData={formData}
                    setFormData={setFormData}
                    students={students}
                    loading={loading}
                    handleSave={handleSave}
                    setIsAdding={setIsAdding}
                />
            ) : (
                <>
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 font-outfit">Health, Safety & Protection</h1>
                            <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span>All safety records are timestamped and auditable.</span>
                            </div>
                        </div>

                        <div className="flex p-1.5 bg-gray-100 rounded-2xl">
                            <button
                                onClick={() => setActiveTab('incidents')}
                                className={`flex items-center space-x-2 px-6 py-2 rounded-xl transition-all font-bold ${activeTab === 'incidents' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Activity className="w-4 h-4" />
                                <span>Incidents</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('drills')}
                                className={`flex items-center space-x-2 px-6 py-2 rounded-xl transition-all font-bold ${activeTab === 'drills' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Flame className="w-4 h-4" />
                                <span>Drills</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('safeguarding')}
                                className={`flex items-center space-x-2 px-6 py-2 rounded-xl transition-all font-bold ${activeTab === 'safeguarding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <ShieldCheck className="w-4 h-4" />
                                <span>Policies</span>
                            </button>
                        </div>
                    </header>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-4">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-400 font-medium animate-pulse">Syncing safety logs...</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'incidents' && <IncidentTab incidents={incidents} setIsAdding={setIsAdding} />}
                            {activeTab === 'drills' && <DrillTab drills={drills} setIsAdding={setIsAdding} />}
                            {activeTab === 'safeguarding' && <PolicyTab policies={policies} setIsAdding={setIsAdding} />}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SafetyHealthLogs;
