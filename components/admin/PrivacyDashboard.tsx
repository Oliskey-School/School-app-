import React, { useState } from 'react';
import { Shield, ShieldAlert, FileText, Trash2, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PrivacyDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'dsar' | 'retention'>('overview');

    const mockDSARs = [
        { id: 'DSAR-001', student: 'John Doe', type: 'Access', status: 'Pending', date: '2026-03-10' },
        { id: 'DSAR-002', student: 'Jane Smith', type: 'Erasure', status: 'Completed', date: '2026-02-15' },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Privacy & NDPR Compliance</h1>
                    <p className="text-gray-500">Manage data protection and subject access requests.</p>
                </div>
                <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100">
                    <Shield className="w-5 h-5" />
                    <span className="font-bold">NDPR Compliant</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {(['overview', 'dsar', 'retention'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-orange-500" />
                                Privacy Impact Assessment (DPIA)
                            </h3>
                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                                <p className="text-sm text-orange-800">Your annual DPIA is due in 15 days. Nigerian Data Protection Commission requirement.</p>
                                <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Start Assessment</button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold mb-4">Privacy Policies</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 transition">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium">Student Privacy Notice</p>
                                            <p className="text-xs text-gray-500">Last updated: Jan 2026</p>
                                        </div>
                                    </div>
                                    <button className="text-indigo-600 font-bold text-sm">Update</button>
                                </div>
                                <div className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 transition">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium">Staff Confidentiality Agreement</p>
                                            <p className="text-xs text-gray-500">Last updated: Dec 2025</p>
                                        </div>
                                    </div>
                                    <button className="text-indigo-600 font-bold text-sm">Update</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg">
                            <p className="text-indigo-200 text-sm font-medium mb-1">DPO Contact</p>
                            <p className="text-lg font-bold">Admin Office</p>
                            <p className="text-indigo-300 text-xs mt-4">Required by NDPR for data controller classification.</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Download className="w-8 h-8 text-blue-600" />
                            </div>
                            <h4 className="font-bold">Compliance Export</h4>
                            <p className="text-sm text-gray-500 mb-4">Download data processing inventory for NDPC audit.</p>
                            <button className="w-full py-2 border rounded-xl font-bold text-sm hover:bg-gray-50">Download (.xlsx)</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'dsar' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold">Active Data Subject Requests</h2>
                        <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">+ Log New Request</button>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {mockDSARs.map(dsar => (
                                <tr key={dsar.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs">{dsar.id}</td>
                                    <td className="px-6 py-4 text-sm font-medium">{dsar.student}</td>
                                    <td className="px-6 py-4 text-sm">{dsar.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dsar.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {dsar.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 text-sm font-bold hover:underline">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'retention' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <Trash2 className="w-6 h-6 text-red-500" />
                        <h2 className="text-lg font-bold">Data Retention Schedules</h2>
                    </div>
                    <p className="text-sm text-gray-500">Configure how long specific data sets are kept before automated purging or anonymization.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-xl space-y-2">
                            <div className="flex justify-between">
                                <span className="font-bold">Academic Records</span>
                                <span className="text-indigo-600 text-sm font-bold">7 Years</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full w-[80%]"></div>
                            </div>
                        </div>
                        <div className="p-4 border rounded-xl space-y-2">
                            <div className="flex justify-between">
                                <span className="font-bold">Medical Records</span>
                                <span className="text-indigo-600 text-sm font-bold">3 Years</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full w-[40%]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrivacyDashboard;
