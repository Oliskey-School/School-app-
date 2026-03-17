import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
    MessageSquare
} from 'lucide-react';

interface BehaviorLog {
    id: string;
    student_name: string;
    class_name: string;
    type: 'positive' | 'negative' | 'neutral';
    category: string;
    description: string;
    points: number;
    parent_visible: boolean;
    logged_at: string;
    teacher_name: string;
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
    const [logs, setLogs] = useState<BehaviorLog[]>([
        { id: '1', student_name: 'Femi Adeyemi', class_name: 'JSS 2A', type: 'positive', category: 'leadership', description: 'Led the science project group exceptionally well. Organized team tasks and ensured everyone contributed.', points: 5, parent_visible: true, logged_at: '2026-03-17T14:30:00', teacher_name: 'Mrs. Okafor' },
        { id: '2', student_name: 'Chioma Okeke', class_name: 'SS 1B', type: 'positive', category: 'participation', description: 'Actively participated in class discussion on Nigerian history. Asked thoughtful questions.', points: 3, parent_visible: true, logged_at: '2026-03-17T11:15:00', teacher_name: 'Mr. Ibrahim' },
        { id: '3', student_name: 'Abubakar Musa', class_name: 'JSS 3A', type: 'negative', category: 'punctuality', description: 'Late to school for the 3rd time this week. Arrived at 8:45 AM instead of 7:30 AM.', points: -2, parent_visible: true, logged_at: '2026-03-17T08:45:00', teacher_name: 'Mrs. Okafor' },
        { id: '4', student_name: 'Blessing Okafor', class_name: 'JSS 1A', type: 'positive', category: 'homework', description: 'Submitted outstanding Mathematics assignment. Perfect score on all word problems.', points: 4, parent_visible: true, logged_at: '2026-03-16T16:00:00', teacher_name: 'Mr. Adebayo' },
        { id: '5', student_name: 'Tunde Bakare', class_name: 'SS 2C', type: 'negative', category: 'conduct', description: 'Disrupted class by talking during the test. Given verbal warning.', points: -3, parent_visible: true, logged_at: '2026-03-16T10:30:00', teacher_name: 'Mrs. Okafor' },
        { id: '6', student_name: 'Amina Ibrahim', class_name: 'JSS 2A', type: 'positive', category: 'creativity', description: 'Created an amazing art piece for the inter-house competition. Represented the house well.', points: 5, parent_visible: true, logged_at: '2026-03-15T13:00:00', teacher_name: 'Mr. Nwosu' },
        { id: '7', student_name: 'Femi Adeyemi', class_name: 'JSS 2A', type: 'neutral', category: 'homework', description: 'Homework submitted but incomplete. Missing last 3 questions. Needs to complete by tomorrow.', points: 0, parent_visible: false, logged_at: '2026-03-15T15:30:00', teacher_name: 'Mrs. Okafor' },
    ]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = logs.filter(log => {
        const matchType = filterType === 'all' || log.type === filterType;
        const matchSearch = log.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || log.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchType && matchSearch;
    });

    const positiveCount = logs.filter(l => l.type === 'positive').length;
    const negativeCount = logs.filter(l => l.type === 'negative').length;
    const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);

    const handleSave = () => {
        if (!formData.student_name || !formData.description) { toast.error('Student name and description are required'); return; }
        const newLog: BehaviorLog = {
            id: Date.now().toString(),
            student_name: formData.student_name,
            class_name: formData.class_name || 'JSS 1A',
            type: formData.type || 'positive',
            category: formData.category || 'conduct',
            description: formData.description,
            points: parseInt(formData.points || '0'),
            parent_visible: formData.parent_visible !== false,
            logged_at: new Date().toISOString(),
            teacher_name: (user as any)?.name || 'Teacher',
        };
        setLogs(prev => [newLog, ...prev]);
        toast.success('Behavior log recorded!');
        setIsAdding(false);
        setFormData({});
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

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
                <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search by student name or description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="flex p-1 bg-gray-100 rounded-xl">
                    {(['all', 'positive', 'negative', 'neutral'] as const).map(type => (
                        <button key={type} onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm capitalize transition-all ${filterType === type ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Log Cards */}
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
                                            <h3 className="font-bold text-gray-900">{log.student_name}</h3>
                                            <div className="flex items-center space-x-3 mt-1">
                                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{log.class_name}</span>
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
                                    <p className="text-sm text-gray-600 mt-2">{log.description}</p>
                                    <div className="flex items-center space-x-4 mt-3">
                                        <span className="text-xs text-gray-400">{log.teacher_name}</span>
                                        <span className="text-xs text-gray-400">{new Date(log.logged_at).toLocaleString('en-NG')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

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
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Student Name <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="e.g., Femi Adeyemi" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.student_name || ''} onChange={e => setFormData({ ...formData, student_name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Class</label>
                                    <input type="text" placeholder="JSS 2A" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.class_name || ''} onChange={e => setFormData({ ...formData, class_name: e.target.value })} />
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
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.category || 'conduct'} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description <span className="text-red-500">*</span></label>
                                <textarea rows={3} placeholder="Describe the behavior..." className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
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
