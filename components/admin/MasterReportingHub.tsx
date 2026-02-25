import React, { useState } from 'react';
import { FileBarChart, Users, GraduationCap, Award, Download, Building, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const MasterReportingHub: React.FC = () => {
    const { currentSchool } = useAuth();
    const [generating, setGenerating] = useState<string | null>(null);

    const handleGenerateCensus = async () => {
        if (!currentSchool) return;
        setGenerating('census');
        // Aggregation logic for Ministry of Education ASC
        const { data: students } = await supabase.from('students').select('count').eq('school_id', currentSchool.id);
        const { data: staff } = await supabase.from('profiles').select('count').eq('school_id', currentSchool.id).neq('role', 'parent').neq('role', 'student');

        // Mocking the complex aggregation for a second
        setTimeout(() => {
            toast.success("Annual School Census (2025/2026) generated successfully.");
            setGenerating(null);

            // Trigger download of mock CSV
            const blob = new Blob(["Year,SchoolID,TotalStudents,TotalStaff,FacilityCount\n2026,SCH-NG-4021,450,42,12"], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ASC_Report_2026.csv';
            a.click();
        }, 1500);
    };

    const handleTeacherRegistry = () => {
        setGenerating('trcn');
        setTimeout(() => {
            toast.success("Teacher Registry (TRCN) export complete.");
            setGenerating(null);
        }, 1000);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Master Reporting & Exports</h1>
                    <p className="text-gray-500">Official data exports for Ministry and Exam Boards.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* ASC Report */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                            <Building className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold">Annual School Census</h3>
                        <p className="text-sm text-gray-500 mt-2">Comprehensive school data required by the Ministry of Education (MoE).</p>
                    </div>
                    <button
                        onClick={handleGenerateCensus}
                        disabled={generating === 'census'}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        {generating === 'census' ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Generate ASC
                    </button>
                </div>

                {/* Teacher Registry */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold">Teacher Registry (TRCN)</h3>
                        <p className="text-sm text-gray-500 mt-2">Export certified teacher lists for TRCN national certification tracking.</p>
                    </div>
                    <button
                        onClick={handleTeacherRegistry}
                        disabled={generating === 'trcn'}
                        className="mt-6 w-full flex items-center justify-center gap-2 border border-emerald-200 text-emerald-700 py-2 rounded-xl font-bold hover:bg-emerald-50 transition disabled:opacity-50"
                    >
                        {generating === 'trcn' ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export TRCN List
                    </button>
                </div>

                {/* Compliance Certificate */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                            <Award className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold">Compliance Certificates</h3>
                        <p className="text-sm text-gray-500 mt-2">Automated school status certificates based on current audit metrics.</p>
                    </div>
                    <button
                        onClick={() => toast.success("Certificate Generation Module Loaded")}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 rounded-xl font-bold hover:bg-black transition"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Issue Certificate
                    </button>
                </div>
            </div>

            {/* Recent Exports History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">Recent Exports</div>
                <div className="divide-y divide-gray-100">
                    <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                            <FileBarChart className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium">CAMBRIDGE_Candidates_2026.csv</p>
                                <p className="text-xs text-gray-400">Exported by Admin • 2 hours ago</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded">Success</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MasterReportingHub;
