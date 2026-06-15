/**
 * Single source of truth for the school day's period structure — shared by the
 * Timetable Builder (multi-class grid) and the Timetable Editor (per-class grid)
 * so data saved in one shows up in the other.
 *
 * Includes the breaks (Short/Long), and the schedule is editable + persisted per
 * school+branch so an admin can change break (and period) times.
 */
export interface PeriodDef {
    name: string;
    start: string; // 'HH:MM'
    end: string;   // 'HH:MM'
    isBreak?: boolean;
}

// Default 8 teaching periods with a short and a long break.
export const DEFAULT_PERIODS: PeriodDef[] = [
    { name: 'Period 1', start: '08:00', end: '08:45' },
    { name: 'Period 2', start: '08:45', end: '09:30' },
    { name: 'Period 3', start: '09:30', end: '10:15' },
    { name: 'Short Break', start: '10:15', end: '10:30', isBreak: true },
    { name: 'Period 4', start: '10:30', end: '11:15' },
    { name: 'Period 5', start: '11:15', end: '12:00' },
    { name: 'Period 6', start: '12:00', end: '12:45' },
    { name: 'Long Break', start: '12:45', end: '13:30', isBreak: true },
    { name: 'Period 7', start: '13:30', end: '14:15' },
    { name: 'Period 8', start: '14:15', end: '15:00' },
];

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const storeKey = (schoolId?: string, branchId?: string) =>
    `timetable_schedule_${schoolId || 'x'}_${(branchId && branchId !== 'all') ? branchId : 'main'}`;

/** Load the saved schedule for this school+branch, else the default. */
export function loadSchedule(schoolId?: string, branchId?: string): PeriodDef[] {
    try {
        const raw = localStorage.getItem(storeKey(schoolId, branchId));
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length && parsed.every((p) => p && p.name && p.start && p.end)) {
                return parsed;
            }
        }
    } catch { /* ignore */ }
    return DEFAULT_PERIODS.map((p) => ({ ...p }));
}

/** Persist the schedule (e.g. after editing break times). */
export function saveSchedule(periods: PeriodDef[], schoolId?: string, branchId?: string) {
    try { localStorage.setItem(storeKey(schoolId, branchId), JSON.stringify(periods)); } catch { /* ignore */ }
}

/** Only the teaching periods (no breaks) — what the Builder drops subjects into. */
export const teachingPeriods = (periods: PeriodDef[]) => periods.filter((p) => !p.isBreak);

/** day_of_week (1=Mon..5=Fri) -> 'Monday'. */
export const dayName = (dow: number): string => DAY_NAMES[(dow - 1)] || 'Monday';

/** 'Monday' -> 1. */
export const dayNumber = (name: string): number => Math.max(1, DAY_NAMES.indexOf(name) + 1);
