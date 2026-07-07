import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Sparkles, Save, GripVertical, X, AlertTriangle, ArrowLeft, Users, Search } from 'lucide-react';
import { loadSchedule, teachingPeriods, DEFAULT_PERIODS, PeriodDef } from '../../lib/timetableSchedule';
import { getSubjectsForGrade } from '../../lib/schoolSystem';
import EditTimesModal from './EditTimesModal';

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

// Canonical class structure per level — the columns ALWAYS shown (one per standard
// class), regardless of how many class records exist. A level shows exactly these
// columns: Lower Primary = Primary 1-3, Upper Primary = Primary 4-6, JSS 1-3, SSS 1-3,
// etc. Demo grade convention: Creche -3, Pre-Nursery -2, Nursery 1/2 = -1/0,
// Primary 1-6 = 1-6, JSS 1-3 = 7-9, SSS 1-3 = 10-12.
const CANONICAL: Record<LevelKey, { grade: number; name: string }[]> = {
    senior: [{ grade: 10, name: 'SSS 1' }, { grade: 11, name: 'SSS 2' }, { grade: 12, name: 'SSS 3' }],
    junior: [{ grade: 7, name: 'JSS 1' }, { grade: 8, name: 'JSS 2' }, { grade: 9, name: 'JSS 3' }],
    upperPrimary: [{ grade: 4, name: 'Primary 4' }, { grade: 5, name: 'Primary 5' }, { grade: 6, name: 'Primary 6' }],
    lowerPrimary: [{ grade: 1, name: 'Primary 1' }, { grade: 2, name: 'Primary 2' }, { grade: 3, name: 'Primary 3' }],
    nursery: [{ grade: -1, name: 'Nursery 1' }, { grade: 0, name: 'Nursery 2' }],
    preNursery: [{ grade: -2, name: 'Pre-Nursery' }],
    creche: [{ grade: -3, name: 'Creche' }],
};

const normName = (s: any) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// A rendered grid column: bound to a real class when one exists, otherwise a virtual
// column (`__create__:grade:name`) that is materialised into a real class on Save.
interface Col { id: string; name: string; grade: number; section?: string; classId?: string; isVirtual: boolean; }

// Classify a class record to a level. Name first (what the admin typed in Manage
// Classes), then grade. Single source of truth shared by the column builder and the
// in-component level tabs so a class always lands on the same level in both.
function classLevel(c: any): LevelKey {
    const name = String(c?.name || '').toLowerCase();
    if (/pre[-\s]?nursery|pre[-\s]?kg|reception/.test(name)) return 'preNursery';
    if (/\bsss?\b|senior/.test(name)) return 'senior';
    if (/\bjss?\b|junior/.test(name)) return 'junior';
    if (/(primary|pry|basic|grade)\s*0*[456]\b/.test(name)) return 'upperPrimary';
    if (/(primary|pry|basic|grade)\s*0*[123]\b/.test(name)) return 'lowerPrimary';
    if (/nursery|kg|kindergarten/.test(name)) return 'nursery';
    if (/creche|crèche|day\s*care/.test(name)) return 'creche';
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
}

// Build the columns for one level. EVERY real class in the level gets its OWN column
// (so all sections — SSS 1 A, SSS 1 B, … — and any newly added class are visible, not
// collapsed). Standard classes that don't exist yet become virtual columns so a fresh
// school still shows the canonical set and they auto-create on Save.
function buildColumns(levelKey: LevelKey, classes: any[], bid?: string): Col[] {
    const cols: Col[] = [];
    const seen = new Set<string>();

    // 1. Real classes in this level — one column each. Collapse only EXACT duplicate
    //    records (same name+grade+section+branch), never distinct sections.
    for (const c of classes) {
        if (classLevel(c) !== levelKey) continue;
        const key = `${normName(c.name)}|${c.grade}|${normName(c.section)}|${c.branch_id || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        cols.push({
            id: c.id || `__create__:${c.grade}:${c.name}`,
            name: c.name || CANONICAL[levelKey][0]?.name || 'Class',
            grade: Number(c.grade),
            section: c.section,
            classId: c.id,
            isVirtual: !c.id,
        });
    }

    // 2. Canonical standard classes with no real class yet → fillable virtual columns.
    for (const slot of CANONICAL[levelKey]) {
        const exists = cols.some(col => normName(col.name) === normName(slot.name) || col.grade === slot.grade);
        if (!exists) cols.push({ id: `__create__:${slot.grade}:${slot.name}`, name: slot.name, grade: slot.grade, isVirtual: true });
    }

    cols.sort((a, b) => (a.grade - b.grade)
        || String(a.name).localeCompare(String(b.name))
        || String(a.section || '').localeCompare(String(b.section || '')));
    return cols;
}

// Map every existing class id and name to the column that now represents it, so saved
// lessons reload onto the right column even after the demo re-creates classes with
// fresh ids. Each real class is its own column, so this is a direct id→column map.
function buildClassIndex(classes: any[], bid?: string) {
    const idToCol: Record<string, string> = {};
    const nameToCol: Record<string, string> = {};
    (Object.keys(CANONICAL) as LevelKey[]).forEach(lk => {
        buildColumns(lk, classes, bid).forEach(col => {
            if (!(normName(col.name) in nameToCol)) nameToCol[normName(col.name)] = col.id;
            if (col.classId) idToCol[col.classId] = col.id;
        });
    });
    // Defensive: any class not surfaced as its own column maps by name.
    classes.forEach(c => {
        if (c.id && !idToCol[c.id]) {
            const byName = nameToCol[normName(c.name)];
            if (byName) idToCol[c.id] = byName;
        }
    });
    return { idToCol, nameToCol };
}

const cellKey = (classId: string, day: number, p: number) => `${classId}|${day}|${p}`;

// Senior Secondary subjects are department-specific — combine the core + every track
// (Science / Arts / Commercial) so the palette shows the FULL senior subject list.
const seniorAllSubjects = (grade: number): string[] => Array.from(new Set([
    ...getSubjectsForGrade(grade),
    ...getSubjectsForGrade(grade, 'Science'),
    ...getSubjectsForGrade(grade, 'Arts'),
    ...getSubjectsForGrade(grade, 'Commercial'),
]));

// Every standard curriculum subject across all levels — used to tell an admin-added
// custom subject apart from a built-in one (so customs can be surfaced on every class).
const ALL_CURRICULUM = new Set<string>(
    [
        ...getSubjectsForGrade(0), ...getSubjectsForGrade(3), ...getSubjectsForGrade(6),
        ...getSubjectsForGrade(9), ...seniorAllSubjects(12),
    ].map(s => s.toLowerCase())
);

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
    // Admin-added subjects (saved to the school) that aren't part of a standard
    // curriculum — surfaced on every class palette.
    const [customSubjects, setCustomSubjects] = useState<string[]>([]);
    // lowercased name → Subject row id. Every palette chip is a real school
    // subject row (the backend seeds the standard list for new schools), so
    // every chip can be deleted — school-wide, for this school only.
    const [subjectIdByName, setSubjectIdByName] = useState<Record<string, string>>({});
    // lowercased name → admin-picked display color (Tailwind class set).
    const [subjectColorByName, setSubjectColorByName] = useState<Record<string, string>>({});
    const [newSubjectColor, setNewSubjectColor] = useState<string>('');
    const [newSubject, setNewSubject] = useState('');
    const [addingSubject, setAddingSubject] = useState(false);
    const [deletingSubject, setDeletingSubject] = useState<string | null>(null);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [grid, setGrid] = useState<Grid>({});
    const [levelKey, setLevelKey] = useState<LevelKey>('senior');
    const [day, setDay] = useState<number>(1);
    const [subjectQuery, setSubjectQuery] = useState('');
    const [paletteOpen, setPaletteOpen] = useState(false);
    // Teaching periods come from the SHARED schedule so the times match the
    // Timetable Editor (breaks excluded here — the Builder only places lessons).
    const [periods, setPeriods] = useState<PeriodDef[]>(teachingPeriods(DEFAULT_PERIODS));
    const [scheduleVersion, setScheduleVersion] = useState(0);
    const [editingTimes, setEditingTimes] = useState(false);
    useEffect(() => { setPeriods(teachingPeriods(loadSchedule(sid))); }, [sid, scheduleVersion]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const dragSubject = useRef<string | null>(null);

    // --- load classes, subjects, teachers, existing timetable ---
    // Extracted so Save can re-seed the grid afterwards (cells then carry their saved
    // ids, so re-saving updates rows instead of creating duplicates).
    const loadData = async (silent = false) => {
        if (!sid) return;
        if (!silent) setLoading(true);
        try {
            const [cls, subs, tch, existing] = await Promise.all([
                api.getClasses(sid, bid).catch(() => []),
                api.getSubjects(sid, bid).catch(() => []),
                api.getTeachers(sid, bid).catch(() => []),
                api.getTimetable(bid).catch(() => []),
            ]);
            setClasses(Array.isArray(cls) ? cls : []);
            const teachersOnly = (Array.isArray(tch) ? tch : []).filter((t: any) => {
                const role = (t.role || t.user_role || t.user?.role || t.school_role || '').toLowerCase();
                return !role || role === 'teacher' || role.includes('teacher');
            });
            setTeachers(teachersOnly);
            const subNames = (Array.isArray(subs) ? subs : [])
                .map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
            // Keep each school subject's row id + admin-picked color. Every chip
            // maps to a row (the backend seeds new schools), so all are deletable.
            const idMap: Record<string, string> = {};
            const colorMap: Record<string, string> = {};
            (Array.isArray(subs) ? subs : []).forEach((s: any) => {
                if (s?.id && s?.name) idMap[String(s.name).toLowerCase()] = s.id;
                if (s?.color && s?.name) colorMap[String(s.name).toLowerCase()] = s.color;
            });
            setSubjectIdByName(idMap);
            setSubjectColorByName(colorMap);
            // The school's OWN subject rows are the single source of truth —
            // deleting one removes it here and everywhere else in the school.
            setSubjects(Array.from(new Set(subNames)));
            // A school subject that isn't in any standard curriculum is an admin-added
            // custom subject — keep it so it shows on every class palette.
            setCustomSubjects(Array.from(new Set(
                subNames.filter((n: string) => !ALL_CURRICULUM.has(String(n).toLowerCase()))
            )));

            // Seed the grid from existing slots. Match each saved lesson to its
            // canonical column by class id first, then by class NAME — so lessons
            // reload even after the demo re-creates classes with new ids or after
            // duplicate classes were collapsed into one column. Resolve period index
            // against the saved schedule directly (not the `periods` state, which may
            // not have settled yet on first mount).
            const livePeriods = teachingPeriods(loadSchedule(sid));
            const { idToCol, nameToCol } = buildClassIndex(Array.isArray(cls) ? cls : [], bid);
            const g: Grid = {};
            for (const slot of (Array.isArray(existing) ? existing : [])) {
                const startIdx = livePeriods.findIndex(p => p.start === (slot.start_time || '').slice(0, 5));
                const colId = (slot.class_id && idToCol[slot.class_id]) || nameToCol[normName(slot.class_name)];
                if (colId && slot.day_of_week && startIdx >= 0) {
                    g[cellKey(colId, slot.day_of_week, startIdx)] = {
                        subject: slot.subject, teacher_id: slot.teacher_id || undefined, id: slot.id,
                    };
                }
            }
            setGrid(g);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        if (sid && active) loadData();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sid, bid]);

    // Re-fetch silently (no loading screen) when socket fires class/timetable/subject changes
    const stableLoadData = useCallback(() => { loadData(true); }, [sid, bid]);
    useAutoSync(['classes', 'timetables', 'subjects'], stableLoadData);

    // Classify by the class NAME first (what the admin typed in Manage Classes), then
    // fall back to grade. Order matters: "Pre-Nursery" must be checked before "Nursery".
    const levelOf = (c: any): LevelKey => classLevel(c);
    // Show ONLY the levels that actually have classes in this branch — no empty
    // "No classes found" tabs. A level appears automatically once it has a class
    // (so adding classes in Manage Classes makes its tab show up here).
    const availableLevels = useMemo(
        () => {
            const populated = LEVELS.filter(l => classes.some(c => levelOf(c) === l.key));
            return populated.length ? populated : LEVELS;
        },
        [classes]
    );
    // Canonical columns for the active level (always the standard set, deduped).
    const levelColumns = useMemo(() => buildColumns(levelKey, classes, bid), [classes, levelKey, bid]);
    // Every column across all levels — used by Save to resolve a cell's class name and
    // to materialise virtual columns into real classes.
    const allColumns = useMemo(
        () => (Object.keys(CANONICAL) as LevelKey[]).flatMap(lk => buildColumns(lk, classes, bid)),
        [classes, bid]
    );
    const colMeta = useMemo(() => { const m: Record<string, Col> = {}; allColumns.forEach(c => { m[c.id] = c; }); return m; }, [allColumns]);

    // Responsive: on narrow screens show ONE class column at a time (with a class
    // picker); on wide screens (lg+) show every class side by side.
    const [isWide, setIsWide] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
    useEffect(() => {
        const onResize = () => setIsWide(window.innerWidth >= 1024);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    const [mobileClassIdx, setMobileClassIdx] = useState(0);
    useEffect(() => { setMobileClassIdx(i => (i >= levelColumns.length ? 0 : i)); }, [levelColumns.length, levelKey]);
    const activeMobileIdx = Math.min(mobileClassIdx, Math.max(0, levelColumns.length - 1));
    const shownColumns = (isWide || levelColumns.length <= 1)
        ? levelColumns
        : (levelColumns[activeMobileIdx] ? [levelColumns[activeMobileIdx]] : levelColumns);
    const gridCols = `${isWide ? 88 : 64}px repeat(${shownColumns.length}, minmax(0, 1fr))`;
    // Once classes load, default to the first level that has classes (prefer Senior).
    useEffect(() => {
        if (availableLevels.length === 0) return;
        if (!availableLevels.some(l => l.key === levelKey)) {
            setLevelKey((availableLevels.find(l => l.key === 'senior') || availableLevels[0]).key);
        }
    }, [availableLevels]); // eslint-disable-line

    // Subjects appropriate for the level on screen — the palette and Generate use this
    // class's OWN subjects (plus any custom subjects the admin added globally).
    const levelGrade: Record<LevelKey, number> = {
        senior: 12, junior: 9, upperPrimary: 6, lowerPrimary: 3, nursery: 1, preNursery: 0, creche: 0,
    };
    const levelSubjects = useMemo(() => {
        const grade = levelGrade[levelKey] ?? 9;
        // The school's OWN subject rows are the source; the level's curriculum
        // only FILTERS them (senior = all departments). Deleted rows vanish,
        // and admin-added customs appear on every level.
        const base = levelKey === 'senior' ? seniorAllSubjects(grade) : getSubjectsForGrade(grade);
        const levelSet = new Set((Array.isArray(base) ? base : []).map(n => String(n).toLowerCase()));
        const inLevel = subjects.filter(n => levelSet.has(String(n).toLowerCase()));
        const pool = inLevel.length ? inLevel : subjects;
        return Array.from(new Set([...pool, ...customSubjects]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [levelKey, subjects, customSubjects]);

    // Search stays within this class's subjects.
    const filteredSubjects = useMemo(
        () => levelSubjects.filter(s => s.toLowerCase().includes(subjectQuery.trim().toLowerCase())),
        [levelSubjects, subjectQuery]
    );

    const querying = subjectQuery.trim().length > 0;
    const COLLAPSED_COUNT = 5;
    // Palette shows ONLY this class's subjects: first 5 when collapsed; "Show all"
    // reveals the rest of the class's subjects; search filters within them.
    const visibleSubjects = querying
        ? filteredSubjects
        : (paletteOpen ? levelSubjects : levelSubjects.slice(0, COLLAPSED_COUNT));

    const teacherName = (id?: string) => teachers.find(t => t.id === id)?.full_name || teachers.find(t => t.id === id)?.name || '';
    const teachersForSubject = (subject: string) =>
        teachers.filter(t => Array.isArray(t.subject_specialty) && t.subject_specialty
            .map((s: string) => s.toLowerCase()).includes(subject.toLowerCase()));
    const defaultTeacher = (subject: string) => teachersForSubject(subject)[0]?.id;
    // Admin-picked color wins; otherwise a stable auto color from the palette.
    const subjectColor = (subject: string) =>
        subjectColorByName[String(subject).toLowerCase()]
        || SUBJECT_COLORS[Math.abs(subjects.indexOf(subject)) % SUBJECT_COLORS.length]
        || SUBJECT_COLORS[0];

    // --- conflicts: same teacher in >1 class at the same period on this day ---
    const conflicts = useMemo(() => {
        const set = new Set<string>();
        for (let p = 0; p < periods.length; p++) {
            const seen: Record<string, string[]> = {};
            for (const c of levelColumns) {
                const cell = grid[cellKey(c.id, day, p)];
                if (cell?.teacher_id) (seen[cell.teacher_id] ||= []).push(cellKey(c.id, day, p));
            }
            for (const tid in seen) if (seen[tid].length > 1) seen[tid].forEach(k => set.add(k));
        }
        return set;
    }, [grid, levelColumns, day]);

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

    const shuffled = <T,>(arr: T[]): T[] => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
        return a;
    };

    // --- "Generate with AI": scatter the class's subjects FRESH on every click,
    // overwriting the active day's grid, avoiding the same teacher twice per period.
    // Generation is instant and local — the admin reviews the result and clicks
    // Save to persist it (auto-saving here fired 100+ requests per click and made
    // the button feel frozen).
    const autoGenerate = () => {
        const pool = (levelSubjects.length ? levelSubjects : subjects);
        if (pool.length === 0 || levelColumns.length === 0) { toast.error('Add subjects and classes first.'); return; }
        const next = { ...grid };
        for (let p = 0; p < periods.length; p++) {
            const order = shuffled(pool);
            const usedTeachers = new Set<string>();
            levelColumns.forEach((c, ci) => {
                const subject = String(order[ci % order.length]);
                const candidates = teachersForSubject(subject);
                const free = candidates.find(t => !usedTeachers.has(t.id)) || candidates[0];
                if (free) usedTeachers.add(free.id);
                next[cellKey(c.id, day, p)] = { ...next[cellKey(c.id, day, p)], subject, teacher_id: free?.id };
            });
        }
        setGrid(next);
        toast.success(`Generated ${DAYS.find(d => d.d === day)?.label} for ${LEVELS.find(l => l.key === levelKey)?.label}. Review it, then click Save.`);
    };

    // --- add a custom subject (saved to the school, shown on every class) ---
    const addSubject = async () => {
        const name = newSubject.trim();
        if (!name) return;
        if (levelSubjects.some(s => s.toLowerCase() === name.toLowerCase())) {
            toast.error('That subject is already in the list.');
            return;
        }
        setAddingSubject(true);
        try {
            const created = await api.createSubject({ name, color: newSubjectColor || undefined });
            setCustomSubjects(prev => Array.from(new Set([...prev, name])));
            setSubjects(prev => Array.from(new Set([...prev, name])));
            if (created?.id) setSubjectIdByName(prev => ({ ...prev, [name.toLowerCase()]: created.id }));
            if (newSubjectColor) setSubjectColorByName(prev => ({ ...prev, [name.toLowerCase()]: newSubjectColor }));
            setNewSubject('');
            setNewSubjectColor('');
            toast.success(`Added “${name}”.`);
        } catch {
            toast.error('Could not add subject. Please try again.');
        } finally {
            setAddingSubject(false);
        }
    };

    // --- delete a school subject (only chips backed by a real Subject row).
    // The backend broadcasts the change, so every open screen's subject list
    // (class form, gradebook, student My Subjects) refreshes too.
    const removeSubject = async (name: string) => {
        const id = subjectIdByName[name.toLowerCase()];
        if (!id) return;
        if (!window.confirm(`Delete "${name}" from your school's subjects? It will disappear from subject lists everywhere. Lessons already on the timetable keep their name.`)) return;
        setDeletingSubject(name);
        try {
            await api.deleteSubject(id);
            setCustomSubjects(prev => prev.filter(n => n.toLowerCase() !== name.toLowerCase()));
            setSubjects(prev => prev.filter(n => n.toLowerCase() !== name.toLowerCase()));
            setSubjectIdByName(prev => { const next = { ...prev }; delete next[name.toLowerCase()]; return next; });
            toast.success(`Deleted “${name}”.`);
        } catch {
            toast.error('Could not delete subject.');
        } finally {
            setDeletingSubject(null);
        }
    };

    // --- save: create/update every filled cell across ALL days ---
    // Virtual columns (standard classes that don't exist yet, e.g. a fresh Primary 6)
    // are materialised into a real class up-front; the lesson writes then run in
    // parallel batches so saving a full week stays fast even with many classes.
    const save = async (overrideGrid?: Record<string, any>) => {
        setSaving(true);
        let ok = 0, fail = 0;
        try {
            // 1. Collect filled cells.
            const effectiveGrid = overrideGrid ?? grid;
            const cells = Object.keys(effectiveGrid)
                .map(key => ({ key, cell: effectiveGrid[key], parts: key.split('|') }))
                .filter(x => x.cell?.subject);

            // 2. Materialise every virtual column ONCE (sequential — there are few, and
            //    creating the same class twice in parallel would duplicate it).
            const createdClassIds: Record<string, string> = {};
            for (const colId of Array.from(new Set(cells.map(c => c.parts[0])))) {
                if (!colId.startsWith('__create__:')) continue;
                const meta = colMeta[colId];
                try {
                    const created = await api.createClass({
                        name: meta?.name || colId.split(':')[2] || 'Class',
                        grade: meta?.grade ?? Number(colId.split(':')[1]),
                        section: 'A',
                        school_id: sid,
                        branch_id: bid || null,
                    });
                    if (created?.id) createdClassIds[colId] = created.id;
                } catch { /* its cells will be counted as failures below */ }
            }

            // 3. Write lessons in parallel batches.
            const BATCH = 20;
            for (let i = 0; i < cells.length; i += BATCH) {
                const results = await Promise.allSettled(cells.slice(i, i + BATCH).map(({ cell, parts }) => {
                    const [colId, dStr, pStr] = parts;
                    const classId = colId.startsWith('__create__:') ? createdClassIds[colId] : colId;
                    if (!classId) return Promise.reject(new Error('no class'));
                    const p = periods[Number(pStr)];
                    const meta = colMeta[colId];
                    const payload: any = {
                        class_id: classId,
                        class_name: meta?.name || classes.find(c => c.id === classId)?.name,
                        subject: cell.subject,
                        teacher_id: cell.teacher_id || null,
                        day_of_week: Number(dStr),
                        start_time: p.start,
                        end_time: p.end,
                        branch_id: bid,
                    };
                    return cell.id ? api.updateTimetable(cell.id, payload) : api.createTimetable(payload);
                }));
                for (const r of results) (r.status === 'fulfilled' ? ok++ : fail++);
            }

            if (fail === 0) toast.success(`Timetable saved (${ok} periods).`);
            else toast.error(`Saved ${ok}, ${fail} failed.`);
            // Re-load SILENTLY so cells pick up their saved ids (and any classes just
            // created) without blanking the whole screen behind a loading state —
            // re-saving then updates rows instead of duplicating them.
            await loadData(true);
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => handleBack ? handleBack() : navigateTo?.('timetableGenerator', 'Timetable');
    const filledCount = (Object.values(grid) as Cell[]).filter(c => c.subject).length;

    if (loading) {
        return <div className="flex items-center justify-center min-h-[50vh] text-slate-500">Loading timetable builder…</div>;
    }

    return (
        <div className="w-full h-full overflow-y-auto p-4 sm:p-6">
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
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setEditingTimes(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-50 text-amber-700 px-3 py-2.5 text-sm font-semibold hover:bg-amber-100">
                        ⏱ Edit Times
                    </button>
                    <button onClick={autoGenerate} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                        <Sparkles className="h-4 w-4" /> <span className="whitespace-nowrap">Generate with AI</span>
                    </button>
                    {/* NOTE: () => save() — passing `save` directly would hand the click
                        event to the overrideGrid param and silently save 0 periods. */}
                    <button onClick={() => save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300">
                        <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Level toggle + Day tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex flex-nowrap overflow-x-auto max-w-full rounded-xl bg-slate-100 p-1">
                    {(availableLevels.length ? availableLevels : LEVELS.filter(l => l.key === 'senior')).map(l => (
                        <button key={l.key} onClick={() => setLevelKey(l.key)}
                            className={`flex-none whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${levelKey === l.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                            {l.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-nowrap overflow-x-auto rounded-xl bg-slate-100 p-1">
                    {DAYS.map(({ d, label }) => (
                        <button key={d} onClick={() => setDay(d)}
                            className={`flex-none px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${day === d ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
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
                        {levelSubjects.length === 0 && <p className="text-xs text-slate-400 px-1 py-4">No subjects yet. Add subjects first.</p>}
                        {querying && filteredSubjects.length === 0 && <p className="text-xs text-slate-400 px-1 py-3">No subject matches “{subjectQuery}”.</p>}
                        <div className={`flex lg:flex-col flex-wrap gap-2 ${(paletteOpen || querying) ? 'max-h-[60vh] overflow-y-auto' : ''}`}>
                            {visibleSubjects.map(s => {
                                // Chips backed by a real school Subject row are deletable;
                                // catalog-only names have nothing to delete.
                                const deletable = !!subjectIdByName[s.toLowerCase()];
                                return (
                                    <div key={s} draggable onDragStart={() => { dragSubject.current = s; }}
                                        className={`cursor-grab active:cursor-grabbing select-none flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${subjectColor(s)}`}>
                                        <GripVertical className="h-3 w-3 opacity-50" /> {s}
                                        {deletable && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeSubject(s); }}
                                                disabled={deletingSubject === s}
                                                title={`Delete "${s}" from school subjects`}
                                                className="ml-auto -mr-1 rounded p-0.5 opacity-40 hover:opacity-100 hover:text-rose-600 disabled:opacity-20"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {!querying && levelSubjects.length > COLLAPSED_COUNT && (
                            <button onClick={() => setPaletteOpen(o => !o)}
                                className="mt-2 w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                                {paletteOpen ? 'Show less ▴' : `Show all ${levelSubjects.length} ▾`}
                            </button>
                        )}

                        {/* Add a custom subject (saved to the school, shown on every class) */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <input
                                    value={newSubject}
                                    onChange={e => setNewSubject(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') addSubject(); }}
                                    placeholder="Add a subject…"
                                    className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <button
                                    onClick={addSubject}
                                    disabled={addingSubject || !newSubject.trim()}
                                    className="flex-none rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300">
                                    {addingSubject ? '…' : 'Add'}
                                </button>
                            </div>
                            {/* Pick the chip/cell color for the new subject (optional) */}
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                {SUBJECT_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setNewSubjectColor(prev => prev === c ? '' : c)}
                                        title="Subject color"
                                        className={`h-5 w-5 rounded-full border ${c.split(' ')[0]} ${c.split(' ')[2] || ''} ${newSubjectColor === c ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                    />
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">Saved to your school and shown on every class.</p>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 min-w-0">
                    {/* Mobile/tablet: pick ONE class to view (wide screens show all) */}
                    {!isWide && levelColumns.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
                            {levelColumns.map((c, i) => (
                                <button key={c.id} onClick={() => setMobileClassIdx(i)}
                                    className={`flex-none px-3 py-1.5 rounded-lg text-sm font-semibold transition ${i === activeMobileIdx ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                    {c.name}{c.section ? ` ${c.section}` : ' A'}
                                </button>
                            ))}
                        </div>
                    )}

                    {levelColumns.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                            <Users className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                            No {LEVELS.find(l => l.key === levelKey)?.label} classes found in this branch.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <div className={isWide ? 'min-w-[680px]' : 'min-w-full'}>
                                {/* header row: class names (Period column sticks while scrolling) */}
                                <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                                    <div className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 p-2 text-[11px] font-bold uppercase text-slate-400 flex items-center">Period</div>
                                    {shownColumns.map(c => (
                                        <div key={c.id} className="bg-slate-50 border-b border-r border-slate-200 p-2 text-center">
                                            <p className="text-sm font-bold text-slate-800 truncate">{c.name}{c.section ? ` ${c.section}` : ' A'}</p>
                                            <p className="text-xs text-slate-400">{c.section ? `Section ${c.section}` : `Grade ${c.grade ?? '—'}`}</p>
                                        </div>
                                    ))}
                                </div>
                                {/* period rows */}
                                {periods.map((per, p) => (
                                    <div key={p} className="grid" style={{ gridTemplateColumns: gridCols }}>
                                        <div className="sticky left-0 z-10 border-b border-r border-slate-200 p-2 bg-slate-50">
                                            <p className="text-xs font-bold text-slate-700">P{p + 1}</p>
                                            <p className="text-xs text-slate-400">{per.start}</p>
                                        </div>
                                        {shownColumns.map(c => {
                                            const k = cellKey(c.id, day, p);
                                            const cell = grid[k];
                                            const conflict = conflicts.has(k);
                                            return (
                                                <div key={c.id}
                                                    onDragOver={e => e.preventDefault()}
                                                    onDrop={() => onDrop(c.id, p)}
                                                    className={`border-b border-r border-slate-200 p-1.5 min-h-[72px] transition ${conflict ? 'bg-rose-50 ring-1 ring-inset ring-rose-300' : 'hover:bg-indigo-50/40'}`}>
                                                    {cell?.subject ? (
                                                        <div className={`rounded-lg border p-1.5 ${conflict ? 'border-rose-300 bg-white' : subjectColor(cell.subject)}`}>
                                                            <div className="flex items-start justify-between gap-1">
                                                                <span className="text-xs font-bold leading-tight break-words">{cell.subject}</span>
                                                                <button onClick={() => clearCell(c.id, p)} className="flex-none text-slate-400 hover:text-rose-600"><X className="h-3 w-3" /></button>
                                                            </div>
                                                            <select value={cell.teacher_id || ''} onChange={e => setTeacher(c.id, p, e.target.value)}
                                                                className={`mt-1 w-full bg-white/70 rounded border text-xs px-1 py-0.5 focus:outline-none ${conflict ? 'border-rose-300 text-rose-700' : 'border-slate-200 text-slate-600'}`}>
                                                                <option value="">— teacher —</option>
                                                                {teachers.map(t => (
                                                                    <option key={t.id} value={t.id}>{t.full_name || t.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-300 min-h-[56px]">drop</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <p className="mt-3 text-xs text-slate-400">{filledCount} period{filledCount === 1 ? '' : 's'} set across the week. Conflicts are highlighted in red.</p>
                </div>
            </div>

            <EditTimesModal
                schoolId={sid}
                open={editingTimes}
                onClose={() => setEditingTimes(false)}
                onSaved={() => setScheduleVersion(v => v + 1)}
            />
        </div>
    );
};

export default TimetableDeskBuilder;
