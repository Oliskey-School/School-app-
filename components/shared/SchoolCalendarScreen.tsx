import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SchoolCalendar, CalendarTerm, CalendarEvent, EVENT_TYPE_CONFIG } from '../admin/CalendarManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateYears(appStartYear: number): string[] {
    const end = new Date().getFullYear() + 3;
    const years: string[] = [];
    for (let y = appStartYear; y <= end; y++) years.push(`${y}/${y + 1}`);
    return years;
}

function formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(dateStr: string): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const EventBadge: React.FC<{ event: CalendarEvent }> = ({ event }) => {
    const cfg = EVENT_TYPE_CONFIG[event.type];
    const days = daysLeft(event.start_date);
    const upcoming = days !== null && days >= 0 && days <= 30;

    return (
        <div className={`rounded-xl border px-3 py-2.5 flex items-start gap-3 ${cfg.color}`}>
            <span className="text-lg flex-shrink-0 mt-0.5">{cfg.emoji}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{event.name}</p>
                    {upcoming && days !== null && (
                        <span className="text-[10px] font-bold bg-white/60 px-1.5 py-0.5 rounded-full">
                            {days === 0 ? 'Today!' : `In ${days} day${days === 1 ? '' : 's'}`}
                        </span>
                    )}
                </div>
                <p className="text-xs opacity-70 mt-0.5">
                    {formatDate(event.start_date)}{event.end_date && event.end_date !== event.start_date ? ` → ${formatDate(event.end_date)}` : ''}
                </p>
            </div>
        </div>
    );
};

const TermBlock: React.FC<{ term: CalendarTerm; index: number }> = ({ term, index }) => {
    const colors = [
        { header: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
        { header: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
        { header: 'bg-rose-600',    light: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-100'    },
        { header: 'bg-amber-600',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100'   },
    ];
    const c = colors[index % colors.length];

    const start = term.start_date ? new Date(term.start_date) : null;
    const end   = term.end_date   ? new Date(term.end_date)   : null;
    const now   = new Date();
    const isActive = start && end && now >= start && now <= end;
    const isUpcoming = start && now < start;

    return (
        <div className={`rounded-2xl overflow-hidden border ${c.border} shadow-sm`}>
            <div className={`${c.header} px-5 py-4 text-white`}>
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-base">{term.name}</h3>
                    {isActive && (
                        <span className="text-[11px] font-bold bg-white/25 px-2.5 py-1 rounded-full">
                            🟢 In Progress
                        </span>
                    )}
                    {isUpcoming && !isActive && (
                        <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full">
                            Upcoming
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm opacity-90">
                    <span>📅 Starts: <strong>{formatDate(term.start_date)}</strong></span>
                    <span>🏁 Ends: <strong>{formatDate(term.end_date)}</strong></span>
                </div>
            </div>

            <div className={`${c.light} px-5 py-4`}>
                {term.events.length === 0 ? (
                    <p className={`text-sm ${c.text} opacity-60 text-center py-2`}>No activities scheduled yet.</p>
                ) : (
                    <div className="space-y-2">
                        {term.events
                            .slice()
                            .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
                            .map(ev => (
                                <EventBadge key={ev.id} event={ev} />
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SchoolCalendarScreen: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
    const { currentSchool } = useAuth();
    const settings = (currentSchool as any)?.settings || {};
    const appStartYear: number = settings.app_start_year || new Date().getFullYear() - 1;
    const allCalendars: Record<string, SchoolCalendar> = settings.calendars || {};

    const years = generateYears(appStartYear);
    const nowYear = new Date().getFullYear();
    const defaultYear = `${nowYear}/${nowYear + 1}`;
    const [selectedYear, setSelectedYear] = useState(defaultYear);

    const calendar: SchoolCalendar | null = useMemo(() => allCalendars[selectedYear] || null, [allCalendars, selectedYear]);

    // Next upcoming event across all terms
    const nextEvent = useMemo(() => {
        if (!calendar) return null;
        const now = Date.now();
        return calendar.terms
            .flatMap(t => t.events)
            .filter(ev => ev.start_date && new Date(ev.start_date).getTime() >= now)
            .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null;
    }, [calendar]);

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-24">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-black text-gray-800">📅 School Calendar</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{currentSchool?.name}</p>
                    </div>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="text-sm font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="p-5 space-y-5">
                {/* Next Upcoming Event Banner */}
                {nextEvent && (
                    <div className={`rounded-2xl p-4 flex items-center gap-4 border ${EVENT_TYPE_CONFIG[nextEvent.type].color}`}>
                        <span className="text-3xl">{EVENT_TYPE_CONFIG[nextEvent.type].emoji}</span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60">Next Coming Up</p>
                            <p className="font-black text-base">{nextEvent.name}</p>
                            <p className="text-sm font-medium opacity-70">
                                {formatDate(nextEvent.start_date)}
                                {nextEvent.end_date && nextEvent.end_date !== nextEvent.start_date
                                    ? ` → ${formatDate(nextEvent.end_date)}`
                                    : ''}
                                {(() => { const d = daysLeft(nextEvent.start_date); return d !== null && d >= 0 ? ` · ${d === 0 ? 'Today!' : `${d} day${d === 1 ? '' : 's'} away`}` : ''; })()}
                            </p>
                        </div>
                    </div>
                )}

                {/* No calendar set */}
                {!calendar || calendar.terms.every(t => !t.start_date && t.events.length === 0) ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="font-bold text-gray-700">No calendar set for {selectedYear}</p>
                        <p className="text-sm text-gray-400 mt-1">The admin has not configured the calendar for this academic year yet.</p>
                    </div>
                ) : (
                    <div className={`grid gap-5 ${calendar.mode === 'term' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {calendar.terms.map((term, idx) => (
                            <TermBlock key={term.name} term={term} index={idx} />
                        ))}
                    </div>
                )}

                {/* Legend */}
                {calendar && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Activity Types</p>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(EVENT_TYPE_CONFIG) as (keyof typeof EVENT_TYPE_CONFIG)[]).map(type => (
                                <span key={type} className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1 ${EVENT_TYPE_CONFIG[type].color}`}>
                                    {EVENT_TYPE_CONFIG[type].emoji} {EVENT_TYPE_CONFIG[type].label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchoolCalendarScreen;
