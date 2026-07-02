import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CalendarEventType =
    | 'midterm_break'
    | 'exam_week'
    | 'public_holiday'
    | 'sports_day'
    | 'open_day'
    | 'graduation'
    | 'custom';

export interface CalendarEvent {
    id: string;
    type: CalendarEventType;
    name: string;
    start_date: string;
    end_date: string;
}

export interface CalendarTerm {
    name: string;
    start_date: string;
    end_date: string;
    events: CalendarEvent[];
}

export interface SchoolCalendar {
    year: string;
    mode: 'term' | 'year';
    terms: CalendarTerm[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string; dot: string; emoji: string }> = {
    midterm_break:  { label: 'Mid-Term Break',    color: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-400',  emoji: '☕' },
    exam_week:      { label: 'Exam Week',          color: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-400',     emoji: '📝' },
    public_holiday: { label: 'Public Holiday',     color: 'bg-green-50 text-green-700 border-green-200',     dot: 'bg-green-400',   emoji: '🏖️' },
    sports_day:     { label: 'Sports Day',         color: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-400',    emoji: '🏆' },
    open_day:       { label: 'Open Day',           color: 'bg-purple-50 text-purple-700 border-purple-200',  dot: 'bg-purple-400',  emoji: '👨‍👩‍👧' },
    graduation:     { label: 'Graduation Day',     color: 'bg-yellow-50 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-400',  emoji: '🎓' },
    custom:         { label: 'Custom Activity',    color: 'bg-gray-50 text-gray-700 border-gray-200',        dot: 'bg-gray-400',    emoji: '📅' },
};

const DEFAULT_TERMS: CalendarTerm[] = [
    { name: 'First Term',  start_date: '', end_date: '', events: [] },
    { name: 'Second Term', start_date: '', end_date: '', events: [] },
    { name: 'Third Term',  start_date: '', end_date: '', events: [] },
];

const DEFAULT_FULL_YEAR: CalendarTerm[] = [
    { name: 'Full Year', start_date: '', end_date: '', events: [] },
];

function makeId() {
    return Math.random().toString(36).slice(2, 9);
}

function generateYears(appStartYear: number): string[] {
    const end = new Date().getFullYear() + 3;
    const years: string[] = [];
    for (let y = appStartYear; y <= end; y++) years.push(`${y}/${y + 1}`);
    return years;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const EventRow: React.FC<{
    event: CalendarEvent;
    onChange: (ev: CalendarEvent) => void;
    onRemove: () => void;
}> = ({ event, onChange, onRemove }) => {
    const cfg = EVENT_TYPE_CONFIG[event.type];
    return (
        <div className={`rounded-xl border p-3 ${cfg.color} flex flex-col sm:flex-row gap-2 items-start sm:items-center`}>
            <span className="text-lg flex-shrink-0">{cfg.emoji}</span>

            <select
                value={event.type}
                onChange={e => onChange({ ...event, type: e.target.value as CalendarEventType, name: EVENT_TYPE_CONFIG[e.target.value as CalendarEventType].label })}
                className="text-xs font-semibold bg-white border border-current/20 rounded-lg px-2 py-1.5 outline-none flex-shrink-0"
            >
                {(Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[]).map(t => (
                    <option key={t} value={t}>{EVENT_TYPE_CONFIG[t].label}</option>
                ))}
            </select>

            <input
                type="text"
                placeholder="Event name"
                value={event.name}
                onChange={e => onChange({ ...event, name: e.target.value })}
                className="flex-1 text-xs bg-white border border-current/20 rounded-lg px-2 py-1.5 outline-none min-w-0"
            />

            <div className="flex items-center gap-1 flex-shrink-0">
                <input
                    type="date"
                    value={event.start_date}
                    onChange={e => onChange({ ...event, start_date: e.target.value })}
                    className="text-xs bg-white border border-current/20 rounded-lg px-2 py-1.5 outline-none"
                />
                <span className="text-xs opacity-60">to</span>
                <input
                    type="date"
                    value={event.end_date}
                    onChange={e => onChange({ ...event, end_date: e.target.value })}
                    className="text-xs bg-white border border-current/20 rounded-lg px-2 py-1.5 outline-none"
                />
            </div>

            <button
                onClick={onRemove}
                className="text-current opacity-40 hover:opacity-80 text-lg leading-none flex-shrink-0"
                title="Remove"
            >×</button>
        </div>
    );
};

const TermCard: React.FC<{
    term: CalendarTerm;
    onChange: (t: CalendarTerm) => void;
    isOnly?: boolean;
}> = ({ term, onChange, isOnly }) => {
    const addEvent = () => {
        const ev: CalendarEvent = { id: makeId(), type: 'custom', name: 'Custom Activity', start_date: '', end_date: '' };
        onChange({ ...term, events: [...term.events, ev] });
    };

    const updateEvent = (idx: number, ev: CalendarEvent) => {
        const evs = [...term.events];
        evs[idx] = ev;
        onChange({ ...term, events: evs });
    };

    const removeEvent = (idx: number) => {
        const evs = term.events.filter((_, i) => i !== idx);
        onChange({ ...term, events: evs });
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 text-base">{term.name}</h3>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={term.start_date}
                        onChange={e => onChange({ ...term, start_date: e.target.value })}
                        className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <input
                        type="date"
                        value={term.end_date}
                        onChange={e => onChange({ ...term, end_date: e.target.value })}
                        className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
            </div>

            {term.events.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Activities & Events</p>
                    {term.events.map((ev, idx) => (
                        <EventRow
                            key={ev.id}
                            event={ev}
                            onChange={ev => updateEvent(idx, ev)}
                            onRemove={() => removeEvent(idx)}
                        />
                    ))}
                </div>
            )}

            <button
                onClick={addEvent}
                className="w-full py-2 text-sm font-semibold text-indigo-600 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
                + Add Activity / Event
            </button>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CalendarManager: React.FC = () => {
    const { currentSchool, currentBranchId, refreshCurrentSchool } = useAuth();
    const schoolId = currentSchool?.id;
    const appStartYear: number = (currentSchool as any)?.settings?.app_start_year || new Date().getFullYear() - 1;
    const years = generateYears(appStartYear);
    const nowYear = new Date().getFullYear();
    const defaultYear = `${nowYear}/${nowYear + 1}`;

    const [selectedYear, setSelectedYear] = useState(defaultYear);
    const [calendar, setCalendar] = useState<SchoolCalendar>({
        year: defaultYear,
        mode: 'term',
        terms: DEFAULT_TERMS,
    });
    const [saving, setSaving] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);

    // Load calendar from school settings when year or school changes
    useEffect(() => {
        if (!currentSchool) return;
        const settings = (currentSchool as any).settings || {};
        const allCalendars: Record<string, SchoolCalendar> = settings.calendars || {};
        const saved = allCalendars[selectedYear];
        if (saved) {
            setCalendar(saved);
        } else {
            setCalendar({
                year: selectedYear,
                mode: 'term',
                terms: DEFAULT_TERMS.map(t => ({ ...t, events: [] })),
            });
        }
    }, [currentSchool, selectedYear]);

    // Load branches for "push" feature
    useEffect(() => {
        if (!schoolId) return;
        (api as any).getBranches?.(schoolId)
            .then((data: any[]) => setBranches(data || []))
            .catch(() => setBranches([]));
    }, [schoolId]);

    const handleModeChange = (mode: 'term' | 'year') => {
        setCalendar(prev => ({
            ...prev,
            mode,
            terms: mode === 'year'
                ? DEFAULT_FULL_YEAR.map(t => ({ ...t, events: prev.terms.flatMap(pt => pt.events) }))
                : DEFAULT_TERMS.map(dt => {
                    const existing = prev.terms.find(pt => pt.name === dt.name);
                    return existing || { ...dt, events: [] };
                }),
        }));
    };

    const updateTerm = (idx: number, term: CalendarTerm) => {
        const terms = [...calendar.terms];
        terms[idx] = term;
        setCalendar({ ...calendar, terms });
    };

    const handleSave = async () => {
        if (!schoolId) return;
        setSaving(true);
        try {
            const existingSettings = (currentSchool as any)?.settings || {};
            const allCalendars = { ...(existingSettings.calendars || {}), [selectedYear]: calendar };
            await api.updateSchool(schoolId, {
                settings: { ...existingSettings, calendars: allCalendars }
            });
            await refreshCurrentSchool();
            toast.success('Calendar saved!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save calendar.');
        } finally {
            setSaving(false);
        }
    };

    const handlePushToAllBranches = async () => {
        if (!schoolId || branches.length === 0) {
            toast('No other branches found.');
            return;
        }
        setPushing(true);
        try {
            const existingSettings = (currentSchool as any)?.settings || {};
            const allCalendars = { ...(existingSettings.calendars || {}), [selectedYear]: calendar };
            const calendarPayload = { settings: { calendars: allCalendars } };

            await Promise.all(
                branches
                    .filter(b => b.id !== currentBranchId)
                    .map(b => (api as any).updateBranch?.(b.id, calendarPayload)
                        .catch(() => console.warn(`Failed to push to branch ${b.name}`))
                    )
            );
            toast.success(`Calendar pushed to ${branches.length - 1 > 0 ? branches.length - 1 : 'all'} branch(es). Each branch admin can now edit their own copy.`);
        } catch (err) {
            console.error(err);
            toast.error('Push failed for some branches.');
        } finally {
            setPushing(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-xl">📅</span> School Calendar
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Set term dates, breaks, exams, and activities. Each branch can have its own calendar.</p>
                </div>

                {/* Year Selector */}
                <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="text-sm font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => handleModeChange('term')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all ${calendar.mode === 'term'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Per Term (3 Terms)
                </button>
                <button
                    onClick={() => handleModeChange('year')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all ${calendar.mode === 'year'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Full Year (Single Block)
                </button>
            </div>

            {/* Term / Period Cards */}
            <div className={`grid gap-4 ${calendar.mode === 'term' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {calendar.terms.map((term, idx) => (
                    <TermCard
                        key={term.name}
                        term={term}
                        onChange={t => updateTerm(idx, t)}
                        isOnly={calendar.mode === 'year'}
                    />
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    ) : (
                        <><span>💾</span> Save Calendar</>
                    )}
                </button>

                <button
                    onClick={handlePushToAllBranches}
                    disabled={pushing || branches.length <= 1}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-all shadow-sm flex items-center justify-center gap-2"
                    title={branches.length <= 1 ? 'No other branches found' : `Push to ${branches.length - 1} branch(es)`}
                >
                    {pushing ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Pushing…</>
                    ) : (
                        <><span>📤</span> Push to All Branches</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default CalendarManager;
