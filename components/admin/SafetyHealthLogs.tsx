import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
    UploadCloud
} from 'lucide-react';

type TabType = 'incidents' | 'drills' | 'safeguarding';

interface Incident {
    id: number;
    incident_type: string;
    severity: string;
    description: string;
    action_taken: string;
    incident_date: string;
    notified_parent: boolean;
    student_id: number;
    students?: { name: string };
}

interface Drill {
    id: number;
    drill_type: string;
    drill_date: string;
    duration_minutes: number;
    participants_count: number;
    successful: boolean;
    notes: string;
}

interface Policy {
    id: number;
    title: string;
    version: string;
    effective_date: string;
    status: string;
    file_url: string;
}

const SafetyHealthLogs = () => {
    const [activeTab, setActiveTab] = useState<TabType>('incidents');
    const [loading, setLoading] = useState(true);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'incidents') {
            const { data } = await supabase.from('health_incident_logs').select('*, students(name)').order('incident_date', { ascending: false });
            if (data) setIncidents(data);
        } else if (activeTab === 'drills') {
            const { data } = await supabase.from('emergency_drills').select('*').order('drill_date', { ascending: false });
            if (data) setDrills(data);
        } else if (activeTab === 'safeguarding') {
            const { data } = await supabase.from('safeguarding_policies').select('*').order('effective_date', { ascending: false });
            if (data) setPolicies(data);
        }
        setLoading(false);
    };

    const IncidentTab = () => (
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
                                    {inc.notified_parent && (
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

    const DrillTab = () => (
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
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${drill.successful ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {drill.successful ? 'Successful' : 'Failed'}
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

    const PolicyTab = () => (
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
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
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
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${policy.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>{policy.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-indigo-600 hover:text-indigo-700 font-bold text-sm">Download</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
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
                    {activeTab === 'incidents' && <IncidentTab />}
                    {activeTab === 'drills' && <DrillTab />}
                    {activeTab === 'safeguarding' && <PolicyTab />}
                </div>
            )}
        </div>
    );
};

export default SafetyHealthLogs;
