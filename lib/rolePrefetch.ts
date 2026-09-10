type Role = string;
type Importer = () => Promise<unknown>;

// Only preload high-probability destinations. This intentionally does not
// preload every registered screen or any sensitive API data.
const PREFETCHERS: Record<string, Importer[]> = {
    ADMIN: [
        () => import('../components/admin/StudentListScreen'),
        () => import('../components/admin/TeacherListScreen'),
        () => import('../components/admin/ClassListScreen'),
        () => import('../components/admin/AttendanceOverviewScreen'),
        () => import('../components/admin/TimetableGeneratorScreen'),
    ],
    TEACHER: [
        () => import('../components/teacher/ClassDetailScreen'),
        () => import('../components/teacher/TeacherUnifiedAttendanceScreen'),
        () => import('../components/shared/TimetableScreen'),
        () => import('../components/teacher/LessonNotesUploadScreen'),
        () => import('../components/teacher/TeacherMessagesScreen'),
    ],
    STUDENT: [
        () => import('../components/student/ResultsScreen'),
        () => import('../components/shared/TimetableScreen'),
        () => import('../components/student/AssignmentsScreen'),
        () => import('../components/student/AttendanceScreen'),
        () => import('../components/shared/NotificationsScreen'),
    ],
    PARENT: [
        () => import('../components/student/AttendanceScreen'),
        () => import('../components/parent/FeeStatusScreen'),
        () => import('../components/student/ResultsScreen'),
        () => import('../components/shared/TimetableScreen'),
        () => import('../components/parent/ParentMessagesScreen'),
    ],
};

const ROLE_ALIASES: Record<string, string> = {
    admin: 'ADMIN',
    teacher: 'TEACHER',
    student: 'STUDENT',
    parent: 'PARENT',
};

/**
 * Warm only a small, role-safe set of route chunks after the current dashboard
 * is interactive. Dynamic imports use the browser/module cache, so clicking
 * one of these destinations avoids another network round trip.
 */
export function prefetchRoleChunks(role: Role): () => void {
    let cancelled = false;
    let nextIndex = 0;
    const tasks = PREFETCHERS[ROLE_ALIASES[String(role).toLowerCase()] || String(role).toUpperCase()] || [];
    const concurrency = 2;
    const active = new Set<Promise<unknown>>();

    const pump = () => {
        if (cancelled) return;
        while (active.size < concurrency && nextIndex < tasks.length) {
            const task = tasks[nextIndex++]();
            const promise = task
                .catch(() => undefined)
                .finally(() => active.delete(promise));
            active.add(promise);
        }
        if (nextIndex < tasks.length && active.size > 0) {
            Promise.race(active).then(pump);
        }
    };

    pump();
    return () => { cancelled = true; };
}
