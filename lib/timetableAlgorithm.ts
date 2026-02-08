
// Local Timetable Generation Algorithm
// Implements a Constraint Satisfaction Problem (CSP) solver using backtracking.

export interface TimeSlot {
    day: string;
    periodIndex: number;
    periodName: string;
}

export interface LocalTeacher {
    id: string;
    name: string;
    subjectSpecialization: string[]; // e.g. ["Math", "Physics"]
    availableDays?: string[]; // e.g. ["Monday", "Wednesday"]
}

export interface LocalClass {
    id: string;
    name: string;
    subjects: {
        name: string;
        weeklyFrequency: number; // How many times per week
        teacherId?: string; // Pre-assigned teacher ID (optional)
        preferredTeacherName?: string; // If ID not available
    }[];
}

export interface AlgoInput {
    classes: LocalClass[];
    teachers: LocalTeacher[];
    days: string[]; // ["Monday", "Tuesday", ...]
    periods: number; // e.g. 8
}

export interface GeneratedScheduleResult {
    schedules: {
        className: string;
        schedule: { [cellKey: string]: string }; // "Monday-0": "Math"
        assignments: { [cellKey: string]: string }; // "Monday-0": "Mr. Smith"
    }[];
    globalConflicts: string[];
    success: boolean;
}

// Internal State Types
interface Task {
    id: string;
    classIndex: number;
    subjectName: string;
    teacherIndex: number; // Index in the 'teachers' array
}

export function generateTimetableLocal(input: AlgoInput): GeneratedScheduleResult {
    const { classes, teachers, days, periods } = input;
    // Flatten all requirements into a list of tasks to be assigned.
    // Each task represents one period of a subject for a specific class.
    const tasks: Task[] = [];

    classes.forEach((cls, cIdx) => {
        cls.subjects.forEach(subj => {
            // Find teacher for this subject
            // Heuristic: Prefer teacher explicitly assigned, else find first capable
            let tIdx = -1;

            // Try matching by ID first
            if (subj.teacherId) {
                tIdx = teachers.findIndex(t => t.id === subj.teacherId);
            }
            // Try matching by name
            else if (subj.preferredTeacherName) {
                tIdx = teachers.findIndex(t => t.name === subj.preferredTeacherName);
            }
            // Fallback: Find anyone who teaches this subject
            if (tIdx === -1) {
                // If subject specialization is a list of strings
                tIdx = teachers.findIndex(t => t.subjectSpecialization && t.subjectSpecialization.includes(subj.name));
            }
            // Determine a fallback teacher if none found?
            // For algorithm to work, we need a teacher index if we are tracking teacher constraints.
            // If tIdx remains -1, we won't track teacher busy status for this subject.

            for (let i = 0; i < subj.weeklyFrequency; i++) {
                tasks.push({
                    id: `${cls.id}-${subj.name}-${i}`,
                    classIndex: cIdx,
                    subjectName: subj.name,
                    teacherIndex: tIdx
                });
            }
        });
    });

    // 2. Sort Tasks (Heuristic)
    // Most constrained first:
    // - Teachers with few available days
    // - Subjects with high frequency (harder to fit without clumping)
    tasks.sort((a, b) => {
        const tA = a.teacherIndex !== -1 ? teachers[a.teacherIndex] : null;
        const tB = b.teacherIndex !== -1 ? teachers[b.teacherIndex] : null;

        // Priority 1: Part-time teachers (limited availability)
        const aIsPT = tA && tA.availableDays && tA.availableDays.length < days.length;
        const bIsPT = tB && tB.availableDays && tB.availableDays.length < days.length;

        if (aIsPT && !bIsPT) return -1;
        if (!aIsPT && bIsPT) return 1;

        // Priority 2: Random shuffle for variety
        return Math.random() - 0.5;
    });

    // 3. Initialize State
    // [classIndex][dayIndex][periodIndex] map to Subject Name (string) or null
    // We use a simplified Grid: classIndex -> dayIndex -> periodIndex -> SubjectName
    // Initialized with null
    const scheduleGrid: (string | null)[][][] = [];
    for (let c = 0; c < classes.length; c++) {
        const classGrid = [];
        for (let d = 0; d < days.length; d++) {
            classGrid.push(Array(periods).fill(null));
        }
        scheduleGrid.push(classGrid);
    }

    // Track teacher busy status: [teacherIndex][dayIndex][periodIndex]
    // teacherIndex can be -1, so we handle that separately (no tracking)
    // We only track valid teachers.
    const teacherBusy: boolean[][][] = [];
    for (let t = 0; t < teachers.length; t++) {
        const tGrid = [];
        for (let d = 0; d < days.length; d++) {
            tGrid.push(Array(periods).fill(false));
        }
        teacherBusy.push(tGrid);
    }

    // 4. Backtracking Solver
    function solve(taskIdx: number): boolean {
        if (taskIdx >= tasks.length) return true; // All done

        const task = tasks[taskIdx];
        const { classIndex, teacherIndex, subjectName } = task;

        // Generate possible slots (shuffled for randomness)
        const possibleSlots = [];
        for (let d = 0; d < days.length; d++) {
            for (let p = 0; p < periods; p++) {
                possibleSlots.push({ d, p });
            }
        }
        shuffleArray(possibleSlots);

        for (const slot of possibleSlots) {
            const { d, p } = slot;

            // --- CONSTRAINTS ---

            // 1. Cell Occupied?
            if (scheduleGrid[classIndex][d][p] !== null) continue;

            // 2. Teacher Busy?
            if (teacherIndex !== -1) {
                // Check if teacher is already booked
                if (teacherBusy[teacherIndex][d][p]) continue;

                // 2b. Teacher Availability (PT check)
                const teacher = teachers[teacherIndex];
                if (teacher.availableDays && teacher.availableDays.length > 0) {
                    // Normalize day check? Assuming exact string match "Monday" etc.
                    if (!teacher.availableDays.includes(days[d])) continue;
                }
            }

            // 3. Spread / Clumping (Optimistic)
            // Prevent same subject > 2 times a day
            // Check how many times subject is already in this day for this class
            let dailyCount = 0;
            const daySchedule = scheduleGrid[classIndex][d];
            for (let checkP = 0; checkP < periods; checkP++) {
                if (daySchedule[checkP] === subjectName) dailyCount++;
            }
            // For now, allow max 2 per day per subject
            if (dailyCount >= 2) continue;

            // --- ASSIGN ---
            scheduleGrid[classIndex][d][p] = subjectName;
            if (teacherIndex !== -1) teacherBusy[teacherIndex][d][p] = true;

            // --- RECURSE ---
            if (solve(taskIdx + 1)) return true;

            // --- BACKTRACK ---
            scheduleGrid[classIndex][d][p] = null;
            if (teacherIndex !== -1) teacherBusy[teacherIndex][d][p] = false;
        }

        return false; // No slot found for this task
    };

    // Run Solver
    const success = solve(0);

    // 5. Format Output
    const resultAssignments: any[] = [];

    classes.forEach((cls, cIdx) => {
        const schedMap: { [key: string]: string } = {};
        const assignMap: { [key: string]: string } = {};

        for (let d = 0; d < days.length; d++) {
            for (let p = 0; p < periods; p++) {
                const subj = scheduleGrid[cIdx][d][p];
                if (subj) {
                    const key = `${days[d]}-${p}`; // "Monday-0"
                    schedMap[key] = subj;

                    // Recover teacher Assignment
                    // We need to look up which teacher was used for this Subject in this Class.
                    // The algorithm assigned tasks based on subject.
                    // We can find the task metadata again.
                    // OR optimization: store assignments in a grid parallel to scheduleGrid.
                    const task = tasks.find(t => t.classIndex === cIdx && t.subjectName === subj);
                    if (task && task.teacherIndex !== -1) {
                        assignMap[key] = teachers[task.teacherIndex].name;
                    } else {
                        assignMap[key] = "TBD";
                    }
                }
            }
        }

        resultAssignments.push({
            className: cls.name,
            schedule: schedMap,
            teacherAssignments: assignMap,
            status: 'Draft'
        });
    });

    return {
        schedules: resultAssignments,
        globalConflicts: success ? [] : ["Could not fully satisfy all constraints. Some classes might be incomplete."],
        success
    };
}

// Helper
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
