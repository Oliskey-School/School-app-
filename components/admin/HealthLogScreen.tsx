import React, { useState, useMemo, useEffect } from 'react';
import { HealthLogEntry, Student } from '../../types';
import { SearchIcon, PlusIcon, XCircleIcon, HeartIcon, ClockIcon, CalendarIcon, FilterIcon, RefreshIcon, CheckCircleIcon, ExclamationCircleIcon, TrendingUpIcon } from '../../constants';
// import { getFormattedClassName } from '../../constants'; // unused or keep if needed
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

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


interface HealthLogProps {
    schoolId?: string;
    currentUserId?: string;
}

const HealthLogScreen: React.FC<HealthLogProps> = ({ schoolId, currentUserId }) => {
    const { currentBranchId, user } = useAuth();
    const [logs, setLogs] = useState<HealthLogEntry[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [view, setView] = useState<'list' | 'add'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all');

    // Form state
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [medication, setMedication] = useState('');
    const [dosage, setDosage] = useState('');
    const [parentNotified, setParentNotified] = useState(false);

    // New Searchable Student Selector state
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [isStudentListOpen, setIsStudentListOpen] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!schoolId) return;
            const query = supabase
                .from('students')
                .select('id, name, avatarUrl:avatar_url, grade, section')
                .eq('school_id', schoolId);

            if (currentBranchId) {
                query.eq('branch_id', currentBranchId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching students:', error);
                return;
            }
            if (data) setStudents(data as any);
        };

        const fetchLogs = async () => {
            if (!schoolId) return;
            const { data, error } = await supabase
                .from('health_logs')
                .select(`
                    id,
                    studentId:student_id,
                    loggedDate:logged_date,
                    reason:log_type,
                    notes:description,
                    recordedBy:logged_by,
                    medicationAdministered:medication_administered,
                    parentNotified:parent_notified,
                    students (
                        name,
                        avatarUrl:avatar_url
                    )
                `)
                .eq('school_id', schoolId)
                .order('logged_date', { ascending: false });

            if (error) {
                console.error('Error fetching health logs:', error);
                return;
            }

            if (data) {
                const formattedLogs: HealthLogEntry[] = data.map((log: any) => ({
                    id: log.id,
                    studentId: log.studentId,
                    studentName: log.students?.name || 'Unknown',
                    studentAvatar: log.students?.avatarUrl || '',
                    date: log.loggedDate,
                    time: '',
                    reason: log.reason,
                    notes: log.notes,
                    medicationAdministered: log.medicationAdministered,
                    parentNotified: log.parentNotified,
                    recordedBy: log.recordedBy
                }));
                setLogs(formattedLogs);
            }
        };

        fetchStudents();
        fetchLogs();

        const channel = supabase.channel('health_logs_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'health_logs' }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [schoolId, currentBranchId]);

    // Compute filtered logs based on time filter and search
    const filteredLogs = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        let filtered = logs;

        // Apply time filter
        if (timeFilter === 'today') {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= today;
            });
        } else if (timeFilter === 'week') {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= weekAgo;
            });
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.studentName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [logs, timeFilter, searchTerm]);

    // Compute stats
    const stats = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        return {
            today: logs.filter(log => new Date(log.date) >= today).length,
            week: logs.filter(log => new Date(log.date) >= weekAgo).length
        };
    }, [logs]);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !reason || !notes) {
            toast.error("Please select a student and fill in the reason and notes.");
            return;
        }

        try {
            const { error } = await supabase.from('health_logs').insert({
                student_id: selectedStudent, // UUID string
                school_id: schoolId,
                branch_id: currentBranchId,
                logged_date: new Date().toISOString().split('T')[0],
                log_type: reason,
                description: notes,
                medication_administered: medication ? { name: medication, dosage } : null,
                parent_notified: parentNotified,
                logged_by: currentUserId || user?.id || null
            });

            if (error) throw error;
            toast.success("Health log recorded successfully.");
            setView('list');

            // Reset form
            setSelectedStudent('');
            setStudentSearchQuery('');
            setReason('');
            setNotes('');
            setMedication('');
            setDosage('');
            setParentNotified(false);

        } catch (error) {
            console.error("Error adding health log:", error);
            toast.error("Failed to save health log.");
        }
    };

    // --- RENDER FORM VIEW ---
    if (view === 'add') {
        return (
            <div className="flex flex-col h-full bg-gray-50/50 relative animate-fade-in">
                <div className="bg-white border-b border-gray-100 flex-shrink-0 z-10 sticky top-0">
                    <div className="p-4 md:px-8 md:py-5 max-w-3xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setView('list')}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                            >
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                                    <HeartIcon className="w-5 h-5" />
                                </div>
                                New Health Entry
                            </h3>
                        </div>
                    </div>
                </div>

                <main className="flex-grow p-4 md:px-8 md:py-8 w-full max-w-3xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <form onSubmit={handleAddEntry} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Target Student</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-rose-500 transition-colors">
                                            <SearchIcon className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search name or grade..."
                                            value={studentSearchQuery}
                                            onChange={(e) => {
                                                setStudentSearchQuery(e.target.value);
                                                setIsStudentListOpen(true);
                                            }}
                                            onFocus={() => setIsStudentListOpen(true)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800"
                                        />

                                        {isStudentListOpen && (
                                            <div className="absolute z-[60] mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden animate-slide-in-up">
                                                {students
                                                    .filter(s =>
                                                        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                                        `Grade ${s.grade}${s.section}`.toLowerCase().includes(studentSearchQuery.toLowerCase())
                                                    )
                                                    .map(s => (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedStudent(s.id);
                                                                setStudentSearchQuery(`${s.name} (Grade ${s.grade}${s.section})`);
                                                                setIsStudentListOpen(false);
                                                            }}
                                                            className={`w-full p-3 flex items-center gap-3 hover:bg-rose-50 transition-colors border-b border-gray-50 last:border-0 text-left ${selectedStudent === s.id ? 'bg-rose-50/50' : ''}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0">
                                                                {s.avatarUrl ? (
                                                                    <img src={s.avatarUrl} alt={s.name} className="w-full h-full rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                                        {s.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900 leading-none mb-1">{s.name}</p>
                                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Grade {s.grade}{s.section}</p>
                                                            </div>
                                                            {selectedStudent === s.id && (
                                                                <CheckCircleIcon className="w-4 h-4 text-rose-500 ml-auto" />
                                                            )}
                                                        </button>
                                                    ))}
                                                {students.length === 0 && (
                                                    <div className="p-8 text-center">
                                                        <p className="text-sm text-gray-500">No students found in this branch.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {isStudentListOpen && (
                                        <div
                                            className="fixed inset-0 z-[55] bg-transparent"
                                            onClick={() => setIsStudentListOpen(false)}
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Log Category</label>
                                    <select
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        required
                                        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800"
                                    >
                                        <option value="">-- Select Category --</option>
                                        <option value="medical_visit">Medical Visit</option>
                                        <option value="medication">Medication Administered</option>
                                        <option value="allergy">Allergy Alert</option>
                                        <option value="emergency_contact">Emergency Contact</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Symptoms & Clinical Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Describe symptoms, actions taken, and observations..."
                                    required
                                    rows={5}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none font-medium text-gray-800 leading-relaxed"
                                ></textarea>
                            </div>

                            <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100/50 space-y-6">
                                <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                                    <HeartIcon className="w-4 h-4" />
                                    Medication Details (Optional)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-rose-600/70 mb-1.5 uppercase tracking-wide">Medication Name</label>
                                        <input type="text" value={medication} onChange={e => setMedication(e.target.value)} placeholder="e.g. Paracetamol" className="w-full p-3 bg-white border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-rose-600/70 mb-1.5 uppercase tracking-wide">Dosage / Quantity</label>
                                        <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 500mg, 1 tablet" className="w-full p-3 bg-white border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-gray-800" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${parentNotified ? 'bg-emerald-500' : 'bg-gray-300'}`} onClick={() => setParentNotified(!parentNotified)}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform transform ${parentNotified ? 'translate-x-6' : ''}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-900">Parent Notification Status</p>
                                    <p className="text-xs text-emerald-600/80">Toggle if you have contacted the guardian via phone/SMS.</p>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col md:flex-row gap-4">
                                <button
                                    type="button"
                                    onClick={() => setView('list')}
                                    className="flex-1 py-4 px-6 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98]"
                                >
                                    Cancel & Return
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 px-6 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Save Health Record
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        );
    }

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
                                onClick={() => setView('add')}
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

        </div>
    );
};

export default HealthLogScreen;
