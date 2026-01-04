import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    BarChart3,
    TrendingUp,
    Building2,
    Wrench,
    Activity,
    Lock
} from 'lucide-react';

interface ComplianceMetrics {
    facilities_score: number;
    equipment_score: number;
    safety_score: number;
    safeguarding_score: number;
}

const ComplianceDashboard = () => {
    const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vw_compliance_metrics')
            .select('*')
            .single();

        if (data) setMetrics(data);
        setLoading(false);
    };

    const getStatusColor = (score: number) => {
        if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    const getProgressBarColor = (score: number) => {
        if (score >= 90) return 'bg-emerald-500';
        if (score >= 70) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-medium animate-pulse">Calculating compliance scores...</p>
            </div>
        );
    }

    const overallScore = metrics ? Math.round((metrics.facilities_score + metrics.equipment_score + metrics.safety_score + metrics.safeguarding_score) / 4) : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 font-outfit">Compliance Dashboard</h1>
                    <p className="text-gray-500 mt-1">Real-time governance monitoring and regulatory oversight.</p>
                </div>
                <div className={`px-6 py-3 rounded-2xl border-2 flex items-center space-x-3 ${getStatusColor(overallScore)}`}>
                    <ShieldCheck className="w-6 h-6" />
                    <div>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-70">Overall Status</p>
                        <p className="text-xl font-bold">{overallScore}% Compliant</p>
                    </div>
                </div>
            </header>

            {/* Main Score Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Facilities', score: metrics?.facilities_score || 0, icon: <Building2 />, desc: 'Physical space safety' },
                    { label: 'Equipment', score: metrics?.equipment_score || 0, icon: <Wrench />, desc: 'Asset maintenance' },
                    { label: 'Safety Logs', score: metrics?.safety_score || 0, icon: <Activity />, desc: 'Emergency drills' },
                    { label: 'Safeguarding', score: metrics?.safeguarding_score || 0, icon: <Lock />, desc: 'Policy compliance' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group">
                        <div className="flex justify-between items-center">
                            <div className={`p-3 rounded-2xl ${getStatusColor(stat.score)}`}>
                                {stat.icon}
                            </div>
                            <span className="text-2xl font-black text-gray-900">{stat.score}%</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{stat.label}</h3>
                            <p className="text-xs text-gray-400">{stat.desc}</p>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${getProgressBarColor(stat.score)}`}
                                style={{ width: `${stat.score}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Critical Gaps */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-bold text-gray-800 flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <span>Actionable Compliance Gaps</span>
                        </h2>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">3 Critical Items</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[
                            { item: 'Fire Extinguisher Service Overdue', dept: 'Safety', priority: 'High', date: '5 days ago' },
                            { item: 'Missing Safeguarding Policy v2', dept: 'Admin', priority: 'Critical', date: 'Today' },
                            { item: 'Laboratory Ventilation Repair', dept: 'Facilities', priority: 'Medium', date: '2 weeks ago' },
                        ].map((gap, i) => (
                            <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-2 h-12 rounded-full ${gap.priority === 'Critical' ? 'bg-red-500' : gap.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <div>
                                        <p className="font-bold text-gray-800">{gap.item}</p>
                                        <p className="text-xs text-gray-400">{gap.dept} • Reported {gap.date}</p>
                                    </div>
                                </div>
                                <button className="px-4 py-2 text-indigo-600 font-bold text-sm bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">Fix Now</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Compliance Trend */}
                <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-indigo-200">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-indigo-100 uppercase tracking-widest text-xs">Monthly Trend</h2>
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl font-black">+8.4%</p>
                        <p className="text-sm text-indigo-300">Improvement since last inspection period.</p>
                    </div>
                    <div className="flex items-end justify-between h-32 pt-4">
                        {[40, 65, 55, 80, 75, 92].map((h, i) => (
                            <div key={i} className="w-4 bg-indigo-400/30 rounded-t-lg relative group">
                                <div
                                    className="absolute bottom-0 w-full bg-indigo-300 rounded-t-lg transition-all duration-1000 group-hover:bg-emerald-400"
                                    style={{ height: `${h}%` }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-indigo-800/50">
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all text-sm">Download Performance Audit</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplianceDashboard;
