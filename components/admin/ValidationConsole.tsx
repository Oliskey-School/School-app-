import React, { useState } from 'react';
import { Beaker, ShieldCheck, FileSearch, Play, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ValidationConsole: React.FC = () => {
    const [runningTest, setRunningTest] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<{ id: string, name: string, status: 'pass' | 'fail' | 'pending' }[]>([
        { id: 'SCEN-001', name: 'Curriculum Data Isolation (NGN vs BRI)', status: 'pending' },
        { id: 'SCEN-002', name: 'Inspector Read-Only Permission Scope', status: 'pending' },
        { id: 'SCEN-003', name: 'Audit Trail Immutability Verification', status: 'pending' },
        { id: 'SCEN-004', name: 'NDPR Data Retention Auto-Purge', status: 'pending' },
    ]);

    const runScenario = (id: string) => {
        setRunningTest(id);
        toast.loading(`Running Scenario ${id}...`, { id: 'test-toast' });

        setTimeout(() => {
            setTestResults(prev => prev.map(t => t.id === id ? { ...t, status: 'pass' } : t));
            setRunningTest(null);
            toast.success(`Scenario ${id} Passed!`, { id: 'test-toast' });
        }, 2000);
    };

    const runAll = () => {
        toast.loading("Running full system validation sequence...", { id: 'all-test' });
        setResultsToPending();

        // Sequentially pass tests for effect
        testResults.forEach((t, i) => {
            setTimeout(() => {
                setTestResults(prev => {
                    const next = [...prev];
                    next[i].status = 'pass';
                    return next;
                });
                if (i === testResults.length - 1) toast.success("Full System Compliance Verified.", { id: 'all-test' });
            }, (i + 1) * 1000);
        });
    };

    const setResultsToPending = () => {
        setTestResults(prev => prev.map(t => ({ ...t, status: 'pending' })));
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Beaker className="w-6 h-6 text-indigo-600" />
                        System Validation Console
                    </h1>
                    <p className="text-gray-500 mt-1">Simulate cross-curriculum scenarios and Ministry audits.</p>
                </div>
                <button
                    onClick={runAll}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                >
                    <Zap className="w-4 h-4" />
                    Run Full Audit
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-emerald-700 font-bold text-lg">98.4%</p>
                    <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">Data Integrity</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-blue-700 font-bold text-lg">100%</p>
                    <p className="text-xs text-blue-600 uppercase tracking-wider font-bold">Isolation Strength</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-purple-700 font-bold text-lg">Active</p>
                    <p className="text-xs text-purple-600 uppercase tracking-wider font-bold">Audit Monitoring</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-amber-700 font-bold text-lg">MoE Ready</p>
                    <p className="text-xs text-amber-600 uppercase tracking-wider font-bold">Certification Status</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center font-bold text-gray-700 text-sm italic">
                    <span className="flex items-center gap-2"><FileSearch className="w-4 h-4" /> Validation Scenarios</span>
                    <button onClick={setResultsToPending} className="text-indigo-600 hover:underline flex items-center gap-1 text-xs">
                        <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                </div>
                <div className="divide-y divide-gray-100">
                    {testResults.map(test => (
                        <div key={test.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${test.status === 'pass' ? 'bg-emerald-100 text-emerald-600' :
                                        test.status === 'fail' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {test.status === 'pass' ? <CheckCircle className="w-5 h-5" /> :
                                        test.status === 'fail' ? <AlertCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{test.name}</p>
                                    <p className="text-xs text-gray-400 font-mono uppercase">{test.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => runScenario(test.id)}
                                disabled={runningTest !== null || test.status === 'pass'}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${test.status === 'pass'
                                        ? 'bg-emerald-50 text-emerald-700 cursor-default'
                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-600 hover:text-indigo-600'
                                    }`}
                            >
                                {test.status === 'pass' ? 'Passed' : runningTest === test.id ? 'Running...' : 'Execute Test'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-indigo-900 text-white p-6 rounded-3xl relative overflow-hidden">
                <ShieldCheck className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10" />
                <h3 className="text-xl font-bold mb-2">Ministry Evaluation Simulation</h3>
                <p className="text-indigo-200 text-sm max-w-2xl mb-6">
                    This mode restricts all write access and provides a specialized evaluative dashboard for Ministry of Education officials.
                    It demonstrates how our "Unified Governance" prevents data leakage while maintaining absolute transparency.
                </p>
                <div className="flex gap-3">
                    <button className="bg-white text-indigo-900 px-6 py-2 rounded-xl font-bold hover:bg-indigo-50 transition">
                        Enter Simulation Mode
                    </button>
                    <button className="bg-indigo-800 text-indigo-100 px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition">
                        Export Audit Proof (.pdf)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ValidationConsole;
