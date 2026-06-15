import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Sparkles, Save, GripVertical, X, AlertTriangle, ArrowLeft, Users, Search } from 'lucide-react';
import { SUBJECTS_LIST } from '../../constants';

/**
 * Desktop drag-and-drop timetable builder.
 *
 *  - Columns = the classes of the active level (Junior JSS / Senior SSS), side by side.
 *  - Rows    = the 8 periods. Day tabs (Mon–Fri) switch the day.
 *  - Drag a subject from the palette into a cell, then pick the teacher.
 *  - If the same teacher is placed in two classes at the SAME period, both cells turn
 *    red with a warning (you can still save).
 *  - "Generate with AI" instantly auto-fills the active day's grid, round-robin,
 *    avoiding same-period teacher clashes.
 */

interface Props {
    schoolId?: string;
    currentBranchId?: string;
    navigateTo?: (view: string, title?: string, props?: any) => void;
    handleBack?: () => void;
}

interface Cell { subject: string; teacher_id?: string; id?: string; }
type Grid = Record<string, Cell>; // key: `${classId}|${day}|${periodIdx}`

// Full school-stage structure (matches Manage Classes naming).
type LevelKey = 'creche' | 'preNursery' | 'nursery' | 'lowerPrimary' | 'upperPrimary' | 'junior' | 'senior';
const LEVELS: { key: LevelKey; label: string }[] = [
    { key: 'senior', label: 'Senior Secondary' },
    { key: 'junior', label: 'Junior Secondary' },
    { key: 'upperPrimary', label: 'Upper Primary' },
    { key: 'lowerPrimary', label: 'Lower Primary' },
    { key: 'nursery', label: 'Nursery' },
    { key: 'preNursery', label: 'Pre-Nursery' },
    { key: 'creche', label: 'Creche' },
];

const DAYS = [
    { d: 1, label: 'Mon' }, { d: 2, label: 'Tue' }, { d: 3, label: 'Wed' },
    { d: 4, label: 'Thu' }, { d: 5, label: 'Fri' },
];

// 8 periods with default times (admin can refine later; the grid is what matters).
const PERIODS = [
    { label: 'Period 1', start: '08:00', end: '08:40' },
    { label: 'Period 2', start: '08:40', end: '09:20' },
    { label: 'Period 3', start: '09:20', end: '10:00' },
    { label: 'Period 4', start: '10:20', end: '11:00' },
    { label: 'Period 5', start: '11:00', end: '11:40' },
    { label: 'Period 6', start: '11:40', end: '12:20' },
    { label: 'Period 7', start: '13:00', end: '13:40' },
    { label: 'Period 8', start: '13:40', end: '14:20' },
];

const cellKey = (classId: string, day: number, p: number) => `${classId}|${day}|${p}`;

const SUBJECT_COLORS = [
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-orange-100 text-orange-800 border-orange-200',
];

const TimetableDeskBuilder: React.FC<Props> = ({ schoolId, currentBranchId, navigateTo, handleBack }) => {
    const { currentSchool, currentBranchId: ctxBranch } = useAuth() as any;
    const sid = schoolId || currentSchool?.id;
    const bid = (currentBranchId && currentBranchId !== 'all') ? currentBranchId
        : (ctxBranch && ctxBranch !== 'all') ? ctxBranch : undefined;

    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [grid, setGrid] = useState<Grid>({});
    const [levelKey, setLevelKey] = useState<LevelKey>('senior');
    const [day, setDay] = useState<number>(1);
    const [subjectQuery, setSubjectQuery] = useState('');
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const dragSubject = useRef<string | null>(null);

    // --- load classes, subjects, teachers, existing timetable ---
    useEffect(() => {
        if (!sid) return;
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const [cls, subs, tch, existing] = await Promise.all([
                    api.getClasses(sid, bid).catch(() => []),
                    api.getSubjects(sid, bid).catch(() => []),
                    api.getTeachers(sid, bid).catch(() => []),
                    api.getTimetable(bid).catch(() => []),
                ]);
                if (!active) return;
                setClasses(Array.isArray(cls) ? cls : []);
                setTeachers(Array.isArray(tch) ? tch : []);
                const subNames = (Array.isArray(subs) ? subs : [])
                    .map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
                // Merge the school's own subjects (first) with the full curriculum
                // catalog so EVERY subject is draggable and searchable — not just the
                // handful already saved in this school.
                const catalog = (SUBJECTS_LIST || []).map((s: any) => s?.name).filter(Boolean);
                setSubjects(Array.from(new Set([...subNames, ...catalog])));

                // seed the grid from existing slots, keyed by class + day + start_time
                const g: Grid = {};
                const byKey: Record<string, any> = {};
                for (const slot of (Array.isArray(existing) ? existing : [])) {
                    const startIdx = PERIODS.findIndex(p => p.start === (slot.start_time || '').slice(0, 5));
                    if (slot.class_id && slot.day_of_week && startIdx >= 0) {
                        const k = cellKey(slot.class_id, slot.day_of_week, startIdx);
                        g[k] = { subject: slot.subject, teacher_id: slot.teacher_id || undefined, id: slot.id };
                        byKey[k] = slot;
                    }
                }
                setGrid(g);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [sid, bid]);

    // Classify by the class NAME first (what the admin typed in Manage Classes), then
    // fall back to grade. Order matters: "Pre-Nursery" must be checked before "Nursery".
    const levelOf = (c: any): LevelKey => {
        const name = String(c?.name || '').toLowerCase();
        if (/\bsss?\b|senior/.test(name)) return 'senior';
        if (/\bjss?\b|junior/.test(name)) return 'junior';
        if (/(primary|pry|basic|grade)\s*0*[456]\b/.test(name)) return 'upperPrimary';
        if (/(primary|pry|basic|grade)\s*0*[123]\b/.test(name)) return 'lowerPrimary';
        if (/pre[-\s]?nursery|pre[-\s]?kg|reception/.test(name)) return 'preNursery';
        if (/nursery|kg|kindergarten/.test(name)) return 'nursery';
        if (/creche|crèche|day\s*care/.test(name)) return 'creche';
        // grade fallback (demo numbering: Creche -3, Pre-Nursery -2, Nursery -1..0,
        // Primary 1-6, JSS 7-9, SSS 10-12)
        const g = Number(c?.grade);
        if (!isNaN(g)) {
            if (g >= 10) return 'senior';
            if (g >= 7) return 'junior';
            if (g >= 4) return 'upperPrimary';
            if (g >= 1) return 'lowerPrimary';
            if (g >= -1) return 'nursery';
            if (g === -2) return 'preNursery';
        }
        return 'creche';
    };
    // Upper Primary, Junior and Senior always show (the core levels admins build for);
    // Creche/Lower Primary only appear when the branch actually has such classes.
    const ALWAYS_SHOWN = new Set<LevelKey>(['lowerPrimary', 'upperPrimary', 'junior', 'senior']);
    const availableLevels = useMemo(
        () => LEVELS.filter(l => ALWAYS_SHOWN.has(l.key) || classes.some(c => levelOf(c) === l.key)),
        [classes]
    );
    const levelClasses = useMemo(
        () => classes.filter(c => levelOf(c) === levelKey)
            .sort((a, b) => (a.grade || 0) - (b.grade || 0) || String(a.name).localeCompare(String(b.name))),
        [classes, levelKey]
    );
    // Once classes load, default to the first level that has classes (prefer Senior).
    useEffect(() => {
        if (availableLevels.length === 0) return;
        if (!availableLevels.some(l => l.key === levelKey)) {
            setLevelKey((availableLevels.find(l => l.key === 'senior') || availableLevels[0]).key);
        }
    }, [availableLevels]); // eslint-disable-line

    const filteredSubjects = useMemo(
        () => subjects.filter(s => s.toLowerCase().includes(subjectQuery.trim().toLowerCase())),
        [subjects, subjectQuery]
    );
    // Collapsed by default to keep the palette compact: show a few chips; expand on
    // "Show all", and searching reveals every match. So the long list stays hidden
    // until the user actually wants it.
    const querying = subjectQuery.trim().length > 0;
    const COLLAPSED_COUNT = 6;
    const visibleSubjects = querying ? filteredSubjects : (paletteOpen ? subjects : subjects.slice(0, COLLAPSED_COUNT));

    const teacherName = (id?: string) => teachers.find(t => t.id === id)?.full_name || teachers.find(t => t.id === id)?.name || '';
    const teachersForSubject = (subject: string) =>
        teachers.filter(t => Array.isArray(t.subject_specialty) && t.subject_specialty
            .map((s: string) => s.toLowerCase()).includes(subject.toLowerCase()));
    const defaultTeacher = (subject: string) => teachersForSubject(subject)[0]?.id;
    const subjectColor = (subject: string) =>
        SUBJECT_COLORS[Math.abs(subjects.indexOf(subject)) % SUBJECT_COLORS.length] || SUBJECT_COLORS[0];

    // --- conflicts: same teacher in >1 class at the same period on this day ---
    const conflicts = useMemo(() => {
        const set = new Set<string>();
        for (let p = 0; p < PERIODS.length; p++) {
            const seen: Record<string, string[]> = {};
            for (const c of levelClasses) {
                const cell = grid[cellKey(c.id, day, p)];
                if (cell?.teacher_id) (seen[cell.teacher_id] ||= []).push(cellKey(c.id, day, p));
            }
            for (const tid in seen) if (seen[tid].length > 1) seen[tid].forEach(k => set.add(k));
        }
        return set;
    }, [grid, levelClasses, day]);

    // --- drag & drop ---
    const onDrop = (classId: string, p: number) => {
        const subject = dragSubject.current;
        dragSubject.current = null;
        if (!subject) return;
        setGrid(prev => ({ ...prev, [cellKey(classId, day, p)]: { ...prev[cellKey(classId, day, p)], subject, teacher_id: prev[cellKey(classId, day, p)]?.teacher_id || defaultTeacher(subject) } }));
    };
    const setTeacher = (classId: string, p: number, teacher_id: string) =>
        setGrid(prev => ({ ...prev, [cellKey(classId, day, p)]: { ...prev[cellKey(classId, day, p)], teacher_id: teacher_id || undefined } }));
    const clearCell = (classId: string, p: number) =>
        setGrid(prev => { const n = { ...prev }; const k = cellKey(classId, day, p); if (n[k]?.id) n[k] = { ...n[k], subject: '', teacher_id: undefined }; else delete n[k]; return n; });

    // --- auto-generate (the "AI" button): round-robin, clash-avoiding, this day+level ---
    const autoGenerate = () => {
        if (subjects.length === 0 || levelClasses.length === 0) { toast.error('Add subjects and classes first.'); return; }
        setGrid(prev => {
            const next = { ...prev };
            for (let p = 0; p < PERIODS.length; p++) {
                const usedTeachers = new Set<string>();
                levelClasses.forEach((c, ci) => {
                    const k = cellKey(c.id, day, p);
                    if (next[k]?.subject) { if (next[k].teacher_id) usedTeachers.add(next[k].teacher_id!); return; }
                    // pick a subject for this cell (rotate so classes differ)
                    const subject = subjects[(p + ci) % subjects.length];
                    // pick a teacher for the subject who isn't already used this period
                    const candidates = teachersForSubject(subject);
                    const free = candidates.find(t => !usedTeachers.has(t.id)) || candidates[0];
                    if (free) usedTeachers.add(free.id);
                    next[k] = { ...next[k], subject, teacher_id: free?.id };
                });
            }
            return next;
        });
        toast.success(`Auto-filled ${DAYS.find(d => d.d === day)?.label} for ${LEVELS.find(l => l.key === levelKey)?.label} classes.`);
    };

    // --- save: create/update every filled cell across ALL days ---
    const save = async () => {
        setSaving(true);
        let ok = 0, fail = 0;
        try {
            for (const key in grid) {
                const cell = grid[key];
                if (!cell?.subject) continue;
                const [classId, dStr, pStr] = key.split('|');
                const p = PERIODS[Number(pStr)];
                const cls = classes.find(c => c.id === classId);
                const payload: any = {
                    class_id: classId,
                    class_name: cls?.name,
                    subject: cell.subject,
                    teacher_id: cell.teacher_id || null,
                    day_of_week: Number(dStr),
                    start_time: p.start,
                    end_time: p.end,
                    branch_id: bid,
                };
                try {
                    if (cell.id) await api.updateTimetable(cell.id, payload);
                    else await api.createTimetable(payload);
                    ok++;
                } catch { fail++; }
            }
            if (fail === 0) toast.success(`Timetable saved (${ok} periods).`);
            else toast.error(`Saved ${ok}, ${fail} failed.`);
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => handleBack ? handleBack() : navigateTo?.('overview', 'Admin Dashboard');
    const filledCount = (Object.values(grid) as Cell[]).filter(c => c.subject).length;

    if (loading) {
        return <div className="flex items-center justify-center min-h-[50vh] text-slate-500">Loading timetable builder…</div>;
    }

    return (
        <div className="w-full p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <button onClick={goBack} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Calendar className="h-5 w-5 text-indigo-600" /></div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Timetable Builder</h1>
                            <p className="text-xs text-slate-500">Drag subjects into the grid, then pick a teacher.</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={autoGenerate} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                        <Sparkles className="h-4 w-4" /> Generate with AI
                    </button>
                    <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300">
                        <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Level toggle + Day tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
                    {(availableLevels.length ? availableLevels : LEVELS.filter(l => l.key === 'senior')).map(l => (
                        <button key={l.key} onClick={() => setLevelKey(l.key)}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${levelKey === l.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                            {l.label}
                        </button>
                    ))}
                </div>
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                    {DAYS.map(({ d, label }) => (
                        <button key={d} onClick={() => setDay(d)}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${day === d ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {conflicts.size > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                    <AlertTriangle className="h-4 w-4 flex-none" />
                    A teacher is double-booked in the highlighted periods. You can still save, but they can't be in two classes at once.
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4">
                {/* Subject palette */}
                <div className="lg:w-52 flex-none">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2 px-1">Subjects — drag in</p>
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                value={subjectQuery}
                                onChange={e => setSubjectQuery(e.target.value)}
                                placeholder="Search subjects…"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                        {subjects.length === 0 && <p className="text-xs text-slate-400 px-1 py-4">No subjects yet. Add subjects first.</p>}
                        {querying && filteredSubjects.length === 0 && <p className="text-xs text-slate-400 px-1 py-3">No subject matches “{subjectQuery}”.</p>}
                        <div className={`flex lg:flex-col flex-wrap gap-2 ${(paletteOpen || querying) ? 'max-h-[60vh] overflow-y-auto' : ''}`}>
                            {visibleSubjects.map(s => (
                                <div key={s} draggable onDragStart={() => { dragSubject.current = s; }}
                                    className={`cursor-grab active:cursor-grabbing select-none flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${subjectColor(s)}`}>
                                    <GripVertical className="h-3 w-3 opacity-50" /> {s}
                                </div>
                            ))}
                        </div>
                        {!querying && subjects.length > COLLAPSED_COUNT && (
                            <button onClick={() => setPaletteOpen(o => !o)}
                                className="mt-2 w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                                {paletteOpen ? 'Show less ▴' : `Show all ${subjects.length} ▾`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-x-auto">
                    {levelClasses.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                            <Users className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                            No {LEVELS.find(l => l.key === levelKey)?.label} classes found in this branch.
                        </div>
                    ) : (
                        <div className="min-w-[640px] rounded-2xl border border-slate-200 bg-white overflow-hidden">
                            {/* header row: class names */}
                            <div className="grid" style={{ gridTemplateColumns: `90px repeat(${levelClasses.length}, minmax(0,1fr))` }}>
                                <div className="bg-slate-50 border-b border-r border-slate-200 p-2 text-[11px] font-bold uppercase text-slate-400">Period</div>
                                {levelClasses.map(c => (
                                    <div key={c.id} className="bg-slate-50 border-b border-r border-slate-200 p-2 text-center">
                                        <p className="text-sm font-bold text-slate-800">{c.name}{c.section ? ` ${c.section}` : ''}</p>
                                        <p className="text-[10px] text-slate-400">{c.section ? `Section ${c.section}` : `Grade ${c.grade ?? '—'}`}</p>
                                    </div>
                                ))}
                            </div>
                            {/* period rows */}
                            {PERIODS.map((per, p) => (
                                <div key={p} className="grid" style={{ gridTemplateColumns: `90px repeat(${levelClasses.length}, minmax(0,1fr))` }}>
                                    <div className="border-b border-r border-slate-200 p-2 bg-slate-50/60">
                                        <p className="text-xs font-bold text-slate-700">P{p + 1}</p>
                                        <p className="text-[10px] text-slate-400">{per.start}</p>
                                    </div>
                                    {levelClasses.map(c => {
                                        const k = cellKey(c.id, day, p);
                                        const cell = grid[k];
                                        const conflict = conflicts.has(k);
                                        return (
                                            <div key={c.id}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={() => onDrop(c.id, p)}
                                                className={`border-b border-r border-slate-200 p-1.5 min-h-[64px] transition ${conflict ? 'bg-rose-50 ring-1 ring-inset ring-rose-300' : 'hover:bg-indigo-50/40'}`}>
                                                {cell?.subject ? (
                                                    <div className={`rounded-lg border p-1.5 ${conflict ? 'border-rose-300 bg-white' : subjectColor(cell.subject)}`}>
                                                        <div className="flex items-start justify-between gap-1">
                                                            <span className="text-xs font-bold leading-tight">{cell.subject}</span>
                                                            <button onClick={() => clearCell(c.id, p)} className="text-slate-400 hover:text-rose-600"><X className="h-3 w-3" /></button>
                                                        </div>
                                                        <select value={cell.teacher_id || ''} onChange={e => setTeacher(c.id, p, e.target.value)}
                                                            className={`mt-1 w-full bg-white/70 rounded border text-[10px] px-1 py-0.5 focus:outline-none ${conflict ? 'border-rose-300 text-rose-700' : 'border-slate-200 text-slate-600'}`}>
                                                            <option value="">— teacher —</option>
                                                            {teachers.map(t => (
                                                                <option key={t.id} value={t.id}>{t.full_name || t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">drop</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="mt-3 text-xs text-slate-400">{filledCount} period{filledCount === 1 ? '' : 's'} set across the week. Conflicts are highlighted in red.</p>
                </div>
            </div>
        </div>
    );
};

export default TimetableDeskBuilder;
