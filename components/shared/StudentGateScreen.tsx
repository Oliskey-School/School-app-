import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { LogOut, ShieldCheck, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700',
    Approved: 'bg-blue-50 text-blue-700',
    Completed: 'bg-green-50 text-green-700',
    Denied: 'bg-red-50 text-red-700',
};

const StudentGateScreen = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [persons, setPersons] = useState<any[]>([]);
    const [pickupPersonId, setPickupPersonId] = useState('');
    const [unlistedName, setUnlistedName] = useState('');
    const [type, setType] = useState<'EndOfDay' | 'EarlyDismissal'>('EndOfDay');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [log, setLog] = useState<any[]>([]);
    const [actingId, setActingId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await api.getStudents();
                setStudents(Array.isArray(data) ? data : []);
            } catch (err) { console.error('Error loading students:', err); }
        })();
    }, []);

    const fetchLog = useCallback(async () => {
        try {
            const result = await api.getDepartures();
            setLog(Array.isArray(result) ? result.slice(0, 15) : []);
        } catch (err) { console.error('Error loading departure log:', err); }
    }, []);

    useEffect(() => { fetchLog(); }, [fetchLog]);

    useEffect(() => {
        if (!selectedStudentId) { setPersons([]); return; }
        (async () => {
            try {
                const result = await api.getAuthorizedPickupPersons(selectedStudentId);
                setPersons(Array.isArray(result) ? result : []);
            } catch (err) { console.error('Error loading pickup persons:', err); }
        })();
    }, [selectedStudentId]);

    const filteredStudents = search.length >= 2
        ? students.filter(s => (s.name || s.full_name || '').toLowerCase().includes(search.toLowerCase())).slice(0, 8)
        : [];

    const handleSubmit = async () => {
        if (!selectedStudentId) { toast.error('Select a student'); return; }
        if (!pickupPersonId && !unlistedName.trim()) { toast.error('Choose an authorized person or name who is collecting'); return; }
        setSubmitting(true);
        try {
            const departure = await api.requestDeparture({
                student_id: selectedStudentId, type,
                pickup_person_id: pickupPersonId || undefined,
                pickup_person_name: !pickupPersonId ? unlistedName.trim() : undefined,
                reason: reason.trim() || undefined,
            });
            if (type === 'EarlyDismissal') {
                toast.success('Gate pass requested — awaiting admin approval');
            } else if (!pickupPersonId) {
                toast('Recorded — this person is not on the authorized list, please verify identity carefully', { icon: '⚠️' });
            } else {
                toast.success('Approved — ready to confirm pickup');
            }
            setUnlistedName(''); setPickupPersonId(''); setReason('');
            fetchLog();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = async (id: string) => {
        setActingId(id);
        try {
            await api.confirmDeparture(id);
            toast.success('Pickup confirmed');
            fetchLog();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to confirm');
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">Student Departure</h1>
                <p className="text-gray-500">Confirm who's collecting a student, or request an early-dismissal gate pass.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                <input value={selectedStudentId ? (students.find(s => s.id === selectedStudentId)?.name || students.find(s => s.id === selectedStudentId)?.full_name || '') : search}
                    onChange={e => { setSearch(e.target.value); setSelectedStudentId(''); }}
                    placeholder="Search student by name..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                {filteredStudents.length > 0 && !selectedStudentId && (
                    <div className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-40 overflow-y-auto">
                        {filteredStudents.map(s => (
                            <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setSearch(''); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                                {s.name || s.full_name}
                            </button>
                        ))}
                    </div>
                )}

                {selectedStudentId && (
                    <>
                        <div className="flex gap-2">
                            {(['EndOfDay', 'EarlyDismissal'] as const).map(t => (
                                <button key={t} onClick={() => setType(t)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${type === t ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500'}`}>
                                    {t === 'EndOfDay' ? 'Routine Pickup' : 'Early Dismissal'}
                                </button>
                            ))}
                        </div>

                        {persons.length > 0 && (
                            <select value={pickupPersonId} onChange={e => { setPickupPersonId(e.target.value); setUnlistedName(''); }}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                                <option value="">Select authorized person...</option>
                                {persons.map(p => <option key={p.id} value={p.id}>{p.name} ({p.relationship})</option>)}
                            </select>
                        )}
                        <input value={unlistedName} onChange={e => { setUnlistedName(e.target.value); setPickupPersonId(''); }}
                            placeholder="Or type a name if not on the list" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />

                        {type === 'EarlyDismissal' && (
                            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for early dismissal" rows={2}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                        )}

                        <button onClick={handleSubmit} disabled={submitting} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                            {submitting ? 'Submitting...' : type === 'EarlyDismissal' ? 'Request Gate Pass' : 'Log Departure'}
                        </button>
                    </>
                )}
            </div>

            <div>
                <h2 className="font-bold text-gray-900 mb-3">Recent Activity</h2>
                {log.length === 0 ? (
                    <p className="text-sm text-gray-400">No departures logged yet.</p>
                ) : (
                    <div className="space-y-2">
                        {log.map(d => (
                            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {d.is_authorized ? <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" /> : <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{d.student_name}</p>
                                        <p className="text-xs text-gray-400">{d.pickup_person_name || 'Unspecified'} · {d.type === 'EarlyDismissal' ? 'Early Dismissal' : 'Routine Pickup'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
                                    {d.status === 'Approved' && (
                                        <button disabled={actingId === d.id} onClick={() => handleConfirm(d.id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                                            <LogOut className="w-3.5 h-3.5 inline mr-1" /> Confirm
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentGateScreen;
