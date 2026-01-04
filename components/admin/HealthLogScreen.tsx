import React, { useState, useMemo, useEffect } from 'react';
import { HealthLogEntry, Student } from '../../types';
import { SearchIcon, PlusIcon, XCircleIcon, HeartIcon, ClockIcon, CalendarIcon, FilterIcon, RefreshIcon, CheckCircleIcon, ExclamationCircleIcon, TrendingUpIcon } from '../../constants';
// import { getFormattedClassName } from '../../constants'; // unused or keep if needed
import { supabase } from '../../lib/supabase';

// --- TYPES & HELPERS ---
const AILMENT_COLORS: { [key: string]: string } = {
    'Headache': 'bg-orange-100 text-orange-700 border-orange-200',
    'Fever': 'bg-red-100 text-red-700 border-red-200',
    'Injury': 'bg-rose-100 text-rose-700 border-rose-200',
    'Stomach Ache': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Allergy': 'bg-blue-100 text-blue-700 border-blue-200',
    'Checkup': 'bg-green-100 text-green-700 border-green-200',
    'Other': 'bg-gray-100 text-gray-700 border-gray-200'
};

const getAilmentColor = (reason: string) => {
    // Simple keyword matching
    if (reason.match(/headache|migraine/i)) return AILMENT_COLORS['Headache'];
    if (reason.match(/fever|temp/i)) return AILMENT_COLORS['Fever'];
    if (reason.match(/cut|bruise|fracture|injury|pain/i)) return AILMENT_COLORS['Injury'];
    if (reason.match(/stomach|vomit/i)) return AILMENT_COLORS['Stomach Ache'];
    if (reason.match(/allergy|rash/i)) return AILMENT_COLORS['Allergy'];
    if (reason.match(/checkup|routine/i)) return AILMENT_COLORS['Checkup'];
    return AILMENT_COLORS['Other'];
};


const HealthLogScreen: React.FC = () => {
    const [logs, setLogs] = useState<HealthLogEntry[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all');

    // Form state
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [medication, setMedication] = useState('');
    const [dosage, setDosage] = useState('');
    const [parentNotified, setParentNotified] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            const { data } = await supabase.from('students').select('*');
            if (data) setStudents(data);
        };
        fetchStudents();
    }, []);

    const filteredLogs = useMemo(() => {
        let filtered = logs.filter(log => log.studentName.toLowerCase().includes(searchTerm.toLowerCase()));

        if (timeFilter === 'today') {
            const today = new Date().toDateString();
            filtered = filtered.filter(log => new Date(log.date).toDateString() === today);
        } else if (timeFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(log => new Date(log.date) >= weekAgo);
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs, searchTerm, timeFilter]);

    const stats = useMemo(() => {
        const todayCount = logs.filter(l => new Date(l.date).toDateString() === new Date().toDateString()).length;
        const weekCount = logs.filter(l => {
            const d = new Date(l.date);
            const w = new Date();
            w.setDate(w.getDate() - 7);
            return d >= w;
        }).length;
        return { today: todayCount, week: weekCount, total: logs.length };
    }, [logs]);

    const handleAddEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !reason || !notes) {
            toast.error("Please select a student and fill in the reason and notes.");
            return;
        }

        const student = students.find(s => s.id === selectedStudent);
        if (!student) {
            toast.error("Selected student not found.");
            return;
        }

        const newLog: HealthLogEntry = {
            id: Date.now(),
            studentId: student.id,
            studentName: student.name,
            studentAvatar: student.avatarUrl,
            date: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reason,
            notes,
            medicationAdministered: medication ? { name: medication, dosage } : undefined,
            parentNotified,
            recordedBy: 'Admin Nurse',
        };

        setLogs(prev => [newLog, ...prev]);
        setShowAddForm(false);
        // Reset form
        setSelectedStudent('');
        setReason('');
        setNotes('');
        setMedication('');
        setDosage('');
        setParentNotified(false);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 relative">

            {/* --- HEADER SECTION --- */}
            <div className="bg-white border-b border-gray-100 flex-shrink-0 z-10 sticky top-0">
                <div className="p-4 md:px-8 md:py-5 max-w-7xl mx-auto w-full">
                    {/* Title & Stats Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                <HeartIcon className="w-7 h-7 text-rose-500" />
                                Health Log
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Track student health incidents and clinic visits.</p>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                            <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 min-w-[140px]">
                                <div className="p-2 bg-white rounded-lg text-rose-500 shadow-sm">
                                    <ExclamationCircleIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">Today</p>
                                    <p className="text-lg font-bold text-gray-900">{stats.today}</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3 min-w-[140px]">
                                <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm">
                                    <TrendingUpIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">This Week</p>
                                    <p className="text-lg font-bold text-gray-900">{stats.week}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowAddForm(true)}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center gap-2 whitespace-nowrap transform active:scale-95"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span className="font-bold text-sm">New Entry</span>
                            </button>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        {/* Filters */}
                        <div className="flex p-1 bg-gray-100/80 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                            {(['all', 'today', 'week'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setTimeFilter(filter)}
                                    className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all capitalize whitespace-nowrap ${timeFilter === filter
                                        ? 'bg-white text-gray-800 shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                >
                                    {filter === 'all' ? 'All History' : filter}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative w-full md:w-80 group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by student name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-300 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT & GRID --- */}
            <main className="flex-grow p-4 md:px-8 md:py-6 overflow-y-auto w-full max-w-7xl mx-auto">

                {filteredLogs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredLogs.map(log => {
                            const ailmentStyle = getAilmentColor(log.reason);
                            return (
                                <div key={log.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.08)] border border-gray-100 transition-all duration-300 flex flex-col h-full group animate-scale-in">

                                    {/* Header: User & Time */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <img src={log.studentAvatar} alt={log.studentName} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-sm">{log.studentName}</h3>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    <span>{new Date(log.date).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <ClockIcon className="w-3 h-3" />
                                                    <span>{log.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reason Badge */}
                                    <div className="mb-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${ailmentStyle}`}>
                                            <HeartIcon className="w-3.5 h-3.5" />
                                            {log.reason}
                                        </span>
                                    </div>

                                    {/* Notes area */}
                                    <div className="bg-gray-50 rounded-xl p-3 mb-4 flex-grow">
                                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{log.notes}</p>
                                    </div>

                                    {/* Footer: Meds & Parent Status */}
                                    <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                                        {log.medicationAdministered && (
                                            <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                                <span>Meds: {log.medicationAdministered.name} ({log.medicationAdministered.dosage})</span>
                                            </div>
                                        )}
                                        {log.parentNotified && (
                                            <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                <span>Parent Notified</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 animate-fade-in">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <HeartIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Health Records</h3>
                        <p className="text-gray-500">No health logs match your current search or filter.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setTimeFilter('all'); }}
                            className="mt-6 font-bold text-rose-600 hover:text-rose-700"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </main>

            {/* --- ADD MODAL --- */}
            {showAddForm && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in-up">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                                    <HeartIcon className="w-5 h-5" />
                                </div>
                                New Health Entry
                            </h3>
                            <button onClick={() => setShowAddForm(false)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddEntry} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Student</label>
                                <select
                                    value={selectedStudent}
                                    onChange={e => setSelectedStudent(e.target.value)}
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800"
                                >
                                    <option value="">-- Select Student --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} (Grade {s.grade}{s.section})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Condition / Reason</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="e.g. Headache, Fever, Injury..."
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Details & Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Describe symptoms, actions taken, and observations..."
                                    required
                                    rows={3}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none font-medium text-gray-800"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Medication</label>
                                    <input type="text" value={medication} onChange={e => setMedication(e.target.value)} placeholder="Name (Optional)" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Dosage</label>
                                    <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 500mg" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800" />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                                <input
                                    type="checkbox"
                                    id="parentNotified"
                                    checked={parentNotified}
                                    onChange={e => setParentNotified(e.target.checked)}
                                    className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 border-gray-300"
                                />
                                <label htmlFor="parentNotified" className="text-sm font-bold text-gray-700 cursor-pointer select-none">Mark Parent as Notified</label>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Record Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthLogScreen;
