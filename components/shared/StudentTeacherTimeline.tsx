import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Sparkles, GraduationCap, Ban, UserPlus, Trophy, PlusCircle, Trash2, X } from 'lucide-react';

interface TimelineEvent {
    id: string;
    event_type: string;
    title: string;
    description: string | null;
    event_date: string;
    icon?: string | null;
    color?: string | null;
    source: 'auto' | 'manual';
}

const ICONS: Record<string, React.ElementType> = {
    Admission: UserPlus, Hired: UserPlus,
    Graduated: GraduationCap, Transferred: GraduationCap, Withdrawn: GraduationCap,
    Suspension: Ban, Achievement: Trophy,
};

function yearOf(dateStr: string): number {
    return new Date(dateStr).getFullYear();
}

const StudentTeacherTimeline = ({ subjectType, subjectId, canEdit }: { subjectType: 'student' | 'teacher'; subjectId: string; canEdit: boolean }) => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = subjectType === 'student' ? await api.getStudentTimeline(subjectId) : await api.getTeacherTimeline(subjectId);
            setEvents(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error('Error loading timeline:', err);
        } finally {
            setLoading(false);
        }
    }, [subjectType, subjectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAdd = async () => {
        if (!title.trim()) { toast.error('A title is required'); return; }
        setSaving(true);
        try {
            await api.addTimelineEvent({ subject_type: subjectType, subject_id: subjectId, title: title.trim(), description: description.trim() || undefined, event_date: eventDate, event_type: 'Custom' });
            toast.success('Timeline entry added');
            setTitle(''); setDescription(''); setShowAdd(false);
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add entry');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteTimelineEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove entry');
        }
    };

    const grouped = events.reduce<Record<number, TimelineEvent[]>>((acc, e) => {
        const y = yearOf(e.event_date);
        (acc[y] ||= []).push(e);
        return acc;
    }, {});
    const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Timeline</h3>
                {canEdit && (
                    <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                        <PlusCircle className="w-4 h-4" /> Add Entry
                    </button>
                )}
            </div>

            {showAdd && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">New timeline entry</p>
                        <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. Won spelling competition)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={handleAdd} disabled={saving} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                        {saving ? 'Saving...' : 'Add'}
                    </button>
                </div>
            )}

            {loading ? (
                <p className="text-sm text-gray-400">Loading timeline...</p>
            ) : events.length === 0 ? (
                <p className="text-sm text-gray-400">No events recorded yet.</p>
            ) : (
                <div className="space-y-6">
                    {years.map(year => (
                        <div key={year}>
                            <p className="text-sm font-bold text-gray-400 mb-2">{year}</p>
                            <div className="space-y-3 border-l-2 border-gray-100 pl-4 ml-1.5">
                                {grouped[year].map(e => {
                                    const Icon = ICONS[e.event_type] || Sparkles;
                                    return (
                                        <div key={e.id} className="relative group">
                                            <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                                            <div className="flex items-start gap-2">
                                                <Icon className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900 text-sm">{e.title}</p>
                                                    {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                                                    <p className="text-xs text-gray-400">{new Date(e.event_date).toLocaleDateString()}</p>
                                                </div>
                                                {canEdit && e.source === 'manual' && (
                                                    <button onClick={() => handleDelete(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentTeacherTimeline;
