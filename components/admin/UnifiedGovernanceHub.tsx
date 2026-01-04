import React from 'react';
import { Shield, Sparkles, TrendingUp, Globe, Target, Layers, ArrowRight, Award, Zap } from 'lucide-react';

const UnifiedGovernanceHub: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/20 to-transparent"></div>
                <div className="relative z-10 space-y-6 max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-4 py-1.5 rounded-full text-indigo-300 text-sm font-bold uppercase tracking-widest">
                        <Sparkles className="w-4 h-4" />
                        Value Proposition
                    </div>
                    <h1 className="text-5xl font-black leading-tight tracking-tight">
                        Unified Governance for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Modern African Schools.</span>
                    </h1>
                    <p className="text-xl text-gray-400 font-medium">
                        The only platform that bridges the gap between Ministry of Education compliance,
                        dual-track curriculum management, and multi-channel parental empowerment.
                    </p>
                    <div className="flex gap-4 pt-4">
                        <button className="bg-white text-gray-900 px-8 py-3 rounded-2xl font-black hover:bg-gray-100 transition shadow-lg shadow-white/5 active:scale-95">
                            Download Strategy Deck
                        </button>
                        <button className="bg-gray-800 text-white px-8 py-3 rounded-2xl font-bold border border-gray-700 hover:bg-gray-700 transition active:scale-95">
                            Scale to Multi-Campus
                        </button>
                    </div>
                </div>
            </div>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center pt-6">
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Absolute Compliance</h3>
                    <p className="text-gray-500 text-sm px-4 italic leading-relaxed">
                        Pre-configured for Nigerian MoE Standards (ASC, TRCN) and International (Cambridge) audit requirements.
                    </p>
                </div>
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <Layers className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Dual-Track Logic</h3>
                    <p className="text-gray-500 text-sm px-4 italic leading-relaxed">
                        Proprietary data-isolation engine ensures simultaneous management of WAEC and IGCSE tracks without friction.
                    </p>
                </div>
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <Globe className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Edge Connectivity</h3>
                    <p className="text-gray-500 text-sm px-4 italic leading-relaxed">
                        Zero-data USSD, SMS, and Radio-synced lessons reach 100% of parents, regardless of internet access.
                    </p>
                </div>
            </div>

            {/* Operational Health Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 space-y-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Target className="w-6 h-6 text-indigo-600" />
                            Launch Readiness
                        </h3>
                        <div className="text-indigo-600 font-black text-2xl">94%</div>
                    </div>

                    <div className="space-y-6">
                        {[
                            { label: 'Security & Audit Immutability', progress: 100, color: 'bg-indigo-600' },
                            { label: 'Ministry Reporting API', progress: 85, color: 'bg-emerald-500' },
                            { label: 'External Exam Export Logic', progress: 100, color: 'bg-blue-500' },
                            { label: 'Multi-Role Permissions', progress: 92, color: 'bg-purple-500' },
                        ].map(item => (
                            <div key={item.label} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <span>{item.label}</span>
                                    <span>{item.progress}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`${item.color} h-full rounded-full transition-all duration-1000`}
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full flex items-center justify-center gap-2 py-4 bg-gray-50 border rounded-2xl font-bold text-gray-700 hover:bg-gray-100 transition mt-4">
                        View Detailed Audit Logs
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100 flex items-center justify-between group overflow-hidden relative">
                        <div className="space-y-1 relative z-10">
                            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest">Growth Metric</p>
                            <h4 className="text-3xl font-black">Market Expansion</h4>
                            <p className="text-indigo-100 text-sm">Scale to 50+ centers with centralized governance.</p>
                        </div>
                        <TrendingUp className="w-20 h-20 text-white/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition duration-500" />
                        <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center relative z-10 backdrop-blur-sm">
                            <Award className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50">
                        <h4 className="text-xl font-bold mb-6">Certified Security Pro</h4>
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full border-8 border-indigo-600 border-t-emerald-400 flex items-center justify-center p-2">
                                <Zap className="w-8 h-8 text-indigo-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-900 font-black text-lg">NDPR Compliant</p>
                                <p className="text-gray-500 text-sm italic">Verified January 2026. Secure data controller status active.</p>
                                <div className="pt-2">
                                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-200">Active Audit</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedGovernanceHub;
