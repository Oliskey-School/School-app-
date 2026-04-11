import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Star,
    AlertTriangle,
    MinusCircle,
    PlusIcon,
    Search,
    Filter,
    TrendingUp,
    Award,
    ThumbsUp,
    ThumbsDown,
    Clock,
    Users,
    BarChart3,
    CheckCircle2,
    Eye,
    MessageSquare,
    RefreshCw
} from 'lucide-react';
import { useAutoSync } from '../../hooks/useAutoSync';

interface BehaviorLog {
    id: string;
    student_id: string;
    type: 'positive' | 'negative' | 'neutral';
    category: string;
    note: string;
    points: number;
    parent_visible: boolean;
    created_at: string;
    student?: { full_name: string; grade?: string; section?: string };
    teacher?: { full_name: string };
}

const CATEGORIES = [
    { value: 'punctuality', label: 'Punctuality', icon: Clock },
    { value: 'participation', label: 'Class Participation', icon: Users },
    { value: 'homework', label: 'Homework', icon: CheckCircle2 },
    { value: 'conduct', label: 'Conduct & Discipline', icon: Star },
    { value: 'leadership', label: 'Leadership', icon: Award },
    { value: 'collaboration', label: 'Teamwork', icon: Users },
    { value: 'creativity', label: 'Creativity & Innovation', icon: TrendingUp },
    { value: 'sportsmanship', label: 'Sportsmanship', icon: Star },
];

const BehaviorLogScreen = () => {
    const { currentSchool, user } = useAuth();
    const [logs, setLogs] = useState<BehaviorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [currentSchool]);

    useAutoSync(['behavior_notes', 'students'], () => {
        console.log('🔄 [BehaviorLog] Real-time auto-sync triggered');
        fetchData();
    });

    const fetchData = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            const [logsData, studentsData] = await Promise.all([
                api.getBehaviorNotesBySchool(currentSchool.id),
                api.getStudents(currentSchool.id)
            ]);
            setLogs(logsData);
            setStudents(studentsData);
        } catch (err) {
            console.error('Error fetching behavior data:', err);
            toast.error('Failed to load logs');
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchType = filterType === 'all' || log.type === filterType;
        const matchSearch = log.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.note.toLowerCase().includes(searchTerm.toLowerCase());
        return matchType && matchSearch;
    });

    const positiveCount = logs.filter(l => l.type === 'positive').length;
    const negativeCount = logs.filter(l => l.type === 'negative').length;
    const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);

    const handleSave = async () => {
        if (!formData.student_id || !formData.note) { toast.error('Student and note are required'); return; }
        try {
            setLoading(true);
            await api.createBehaviorNote({
                ...formData,
                school_id: currentSchool?.id,
                points: parseInt(formData.points || '0'),
                parent_visible: formData.parent_visible !== false
            });
            toast.success('Behavior log recorded!');
            setIsAdding(false);
            setFormData({});
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Behavior & Progress Tracking</h1>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>Log and monitor student behavior. Parents see entries marked as visible.</span>
                    </div>
                </div>
                <button onClick={() => setIsAdding(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                    <PlusIcon className="w-5 h-5" /><span>Log Behavior</span>
                </button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><BarChart3 className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{logs.length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Logs</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><ThumbsUp className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{positiveCount}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Positive</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-red-50 text-red-600"><ThumbsDown className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{negativeCount}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Negative</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><TrendingUp className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalPoints > 0 ? `+${totalPoints}` : totalPoints}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Points</p></div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-4">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 font-medium animate-pulse">Loading behavior logs...</p>
                </div>
            ) : (
                <div className="space-y-4">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <Star className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">No behavior logs found.</p>
                    </div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                            log.type === 'positive' ? 'border-l-4 border-l-emerald-500 border-gray-100' :
                            log.type === 'negative' ? 'border-l-4 border-l-red-500 border-gray-100' : 'border-l-4 border-l-gray-300 border-gray-100'
                        }`}>
                            <div className="flex items-start space-x-4">
                                <div className={`p-3 rounded-full ${log.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : log.type === 'negative' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {log.type === 'positive' ? <ThumbsUp className="w-5 h-5" /> : log.type === 'negative' ? <ThumbsDown className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{log.student?.full_name}</h3>
                                            <div className="flex items-center space-x-3 mt-1">
                                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{log.student?.grade}</span>
                                                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded capitalize">{log.category}</span>
                                                {log.parent_visible && (
                                                    <span className="text-xs font-bold text-amber-600 flex items-center space-x-1"><Eye className="w-3 h-3" /><span>Parent-visible</span></span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-bold ${log.points > 0 ? 'text-emerald-600' : log.points < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {log.points > 0 ? `+${log.points}` : log.points} pts
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">{log.note}</p>
                                    <div className="flex items-center space-x-4 mt-3">
                                        <span className="text-xs text-gray-400">{log.teacher?.full_name}</span>
                                        <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('en-NG')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            )}

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full space-y-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 font-outfit">Log Behavior</h2>
                            <p className="text-sm text-gray-500">Record positive or negative behavior for a student.</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Student <span className="text-red-500">*</span></label>
                                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.student_id || ''} onChange={e => setFormData({ ...formData, student_id: e.target.value })}>
                                    <option value="">Select Student</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.grade})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                                    <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.category || 'conduct'} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Type</label>
                                    <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.type || 'positive'} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="positive">👍 Positive</option>
                                        <option value="negative">👎 Negative</option>
                                        <option value="neutral">➖ Neutral</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note <span className="text-red-500">*</span></label>
                                <textarea rows={3} placeholder="Describe the behavior..." className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" value={formData.note || ''} onChange={e => setFormData({ ...formData, note: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Points</label>
                                    <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.points || 0} onChange={e => setFormData({ ...formData, points: e.target.value })} />
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={formData.parent_visible !== false} onChange={e => setFormData({ ...formData, parent_visible: e.target.checked })} />
                                        <span className="text-sm font-bold text-gray-600 flex items-center space-x-1"><Eye className="w-4 h-4" /><span>Visible to parent</span></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex space-x-4">
                            <button onClick={() => { setIsAdding(false); setFormData({}); }} className="flex-grow py-4 px-6 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95">Cancel</button>
                            <button onClick={handleSave} className="flex-grow py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">Save Log</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BehaviorLogScreen;

