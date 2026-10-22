import prisma, { withTenantTransaction } from '../config/database';
import { SocketService } from './socket.service';
import { departmentAllows, normalizeDepartment } from '../utils/subjectMatch';

export class ClassService {
    static async getClasses(schoolId: string, branchId: string | undefined, teacherId?: string) {
        if (teacherId) {
            const classTeachers = await prisma.classTeacher.findMany({
                where: {
                    teacher_id: teacherId,
                    class: {
                        school_id: schoolId,
                        branch_id: branchId && branchId !== 'all' ? branchId : undefined
                    }
                },
                include: {
                    class: true
                }
            });

            return classTeachers.map((item: any) => ({
                id: item.class.id,
                name: item.class.name,
                grade: item.class.grade,
                section: item.class.section,
                subject: item.subject?.name || 'Assigned',
                subject_id: item.subject_id,
                school_id: item.class.school_id,
                branch_id: item.class.branch_id
            }));
        } else {
            const whereClause: any = {
                school_id: schoolId,
            };

            // Only filter by branch when a specific branch is requested
            if (branchId && branchId !== 'all') {
                whereClause.branch_id = branchId;
            }

            let classes;
            try {
                classes = await prisma.class.findMany({
                    where: whereClause,
                    include: {
                        _count: {
                            select: { enrollments: true }
                        },
                        // The class's admin-assigned subjects — drives the gradebook
                        // subject list and what enrolled students inherit.
                        subjects: {
                            select: { id: true, name: true }
                        }
                    },
                    orderBy: [
                        { grade: 'desc' },
                        { section: 'asc' }
                    ]
                });
            } catch (queryError: any) {
                console.error('🔴 [ClassService] Prisma Query Error:', queryError.message);
                throw queryError;
            }

            // If no classes exist, return standard levels as 'Shell' classes to populate dropdowns
            if (classes.length === 0) {
                const standardLevels = [
                    { name: 'Creche', grade: -3, section: 'A', level_category: 'Pre-Primary' },
                    { name: 'Pre-Nursery', grade: -2, section: 'A', level_category: 'Pre-Primary' },
                    { name: 'Nursery 1', grade: -1, section: 'A', level_category: 'Pre-Primary' },
                    { name: 'Nursery 2', grade: 0, section: 'A', level_category: 'Pre-Primary' },
                    { name: 'Primary 1', grade: 1, section: 'A', level_category: 'Primary' },
                    { name: 'Primary 2', grade: 2, section: 'A', level_category: 'Primary' },
                    { name: 'Primary 3', grade: 3, section: 'A', level_category: 'Primary' },
                    { name: 'Primary 4', grade: 4, section: 'A', level_category: 'Primary' },
                    { name: 'Primary 5', grade: 5, section: 'A', level_category: 'Primary' },
                    { name: 'Primary 6', grade: 6, section: 'A', level_category: 'Primary' },
                    { name: 'JSS 1', grade: 7, section: 'A', level_category: 'Secondary' },
                    { name: 'JSS 2', grade: 8, section: 'A', level_category: 'Secondary' },
                    { name: 'JSS 3', grade: 9, section: 'A', level_category: 'Secondary' },
                    { name: 'SSS 1', grade: 10, section: 'A', level_category: 'Secondary' },
                    { name: 'SSS 2', grade: 11, section: 'A', level_category: 'Secondary' },
                    { name: 'SSS 3', grade: 12, section: 'A', level_category: 'Secondary' },
                ];

                return standardLevels.map(level => ({
                    id: `std-${level.grade}-${level.section}`, // Virtual ID prefixed with std-
                    ...level,
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null,
                    student_count: 0,
                    studentCount: 0,
                    subjects: [],
                    is_shell: true
                }));
            }

            const depts = await this.departmentMap(prisma, schoolId, classes.map((c: any) => c.id));
            return classes.map((cls: any) => ({
                ...cls,
                subjects: this.withDepartments(cls.id, cls.subjects, depts),
                student_count: cls._count.enrollments,
                studentCount: cls._count.enrollments
            }));
        }
    }

    // Map a list of subject names (or {name} objects) to Subject record ids for
    // this school, creating any subject that doesn't exist yet — so the admin can
    // type a brand-new subject on the class form and it just works.
    private static async resolveSubjectIds(schoolId: string, branchId: string | null, subjects: any[]): Promise<string[]> {
        const names: string[] = Array.from(new Set(
            (subjects || [])
                .map((s: any) => (typeof s === 'string' ? s : (s?.name || '')))
                .map((n: string) => n.trim())
                .filter(Boolean)
        ));
        if (names.length === 0) return [];

        const existing = await prisma.subject.findMany({
            where: { school_id: schoolId, name: { in: names, mode: 'insensitive' } },
            select: { id: true, name: true }
        });
        const byName = new Map(existing.map(s => [s.name.toLowerCase(), s.id]));

        const ids: string[] = [];
        for (const name of names) {
            const found = byName.get(name.toLowerCase());
            if (found) {
                ids.push(found);
            } else {
                const created = await prisma.subject.create({
                    data: { school_id: schoolId, branch_id: branchId, name }
                });
                ids.push(created.id);
            }
        }
        return ids;
    }

    static async createClass(schoolId: string, branchId: string | undefined, classData: any) {
        // `subjects` is a relation — strip it from the spread and connect explicitly.
        const { level, subjects, ...rest } = classData;
        const effectiveBranch = branchId && branchId !== 'all' ? branchId : null;
        const subjectIds = Array.isArray(subjects)
            ? await this.resolveSubjectIds(schoolId, effectiveBranch, subjects)
            : [];

        const result = await prisma.class.create({
            data: {
                ...rest,
                level_category: level || rest.level_category,
                school_id: schoolId,
                branch_id: effectiveBranch,
                ...(subjectIds.length ? { subjects: { connect: subjectIds.map(id => ({ id })) } } : {})
            },
            include: { subjects: { select: { id: true, name: true } } }
        });

        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'create', classId: result.id });
        return result;
    }

    static async updateClass(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        // `subjects` is a relation — when the caller sends a list, REPLACE the
        // class's subject links with it (that's what the form's chips represent).
        const { level, subjects, ...rest } = updates;
        const data: any = {
            ...rest,
            level_category: level || rest.level_category
        };
        if (Array.isArray(subjects)) {
            const effectiveBranch = branchId && branchId !== 'all' ? branchId : null;
            const subjectIds = await this.resolveSubjectIds(schoolId, effectiveBranch, subjects);
            data.subjects = { set: subjectIds.map(sid => ({ id: sid })) };
        }

        // Confirm the class actually belongs to this admin's school/branch before
        // touching it — `updates` alone carried no tenant check, so any class id
        // could otherwise be edited regardless of which school/branch it's in.
        const owned = await prisma.class.findFirst({
            where: { id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
            select: { id: true }
        });
        if (!owned) throw new Error('Class not found in your school/branch');

        const result = await prisma.class.update({
            where: { id: id },
            data,
            include: { subjects: { select: { id: true, name: true } } }
        });

        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'update', classId: id });
        return result;
    }

    // Subjects assigned to ONE class, by class id — the admin gradebook uses this
    // to offer exactly the subjects the class actually takes.
    static async getClassSubjectsById(schoolId: string, classId: string) {
        const cls = await prisma.class.findFirst({
            where: { id: classId, school_id: schoolId },
            include: { subjects: { select: { id: true, name: true, code: true } } }
        });
        if (!cls) return [];
        return this.withDepartments(cls.id, cls.subjects, await this.departmentMap(prisma, schoolId, [cls.id]));
    }

    /** "<class_id>:<subject_id>" -> department, for subjects limited to one department in a class. */
    static async departmentMap(db: any, schoolId: string, classIds: string[]): Promise<Map<string, string>> {
        if (!classIds.length) return new Map();
        const rows = await db.classSubjectDepartment.findMany({
            where: { school_id: schoolId, class_id: { in: classIds } },
            select: { class_id: true, subject_id: true, department: true }
        });
        return new Map(rows.map((r: any) => [`${r.class_id}:${r.subject_id}`, r.department]));
    }

    private static withDepartments(classId: string, subjects: any[] | undefined, depts: Map<string, string>) {
        return (subjects || []).map((s: any) => ({ ...s, department: depts.get(`${classId}:${s.id}`) || null }));
    }

    /**
     * Departments in use at this class's level: from its arms (Class.department)
     * and their enrolled students (Student.department). Empty = the school does
     * not split this level by department, so the picker is hidden.
     */
    static async getLevelDepartments(schoolId: string, branchId: string | undefined, anchorId: string) {
        const branchWhere = branchId && branchId !== 'all' ? { branch_id: branchId } : {};
        const anchor = await prisma.class.findFirst({ where: { id: anchorId, school_id: schoolId, deleted_at: null, ...branchWhere }, select: { grade: true } });
        if (!anchor) throw new Error('Class not found in your school/branch');
        const arms = await prisma.class.findMany({ where: { school_id: schoolId, grade: anchor.grade, deleted_at: null, ...branchWhere }, select: { id: true, department: true } });
        const students = await this.enrolledStudents(prisma, schoolId, arms.map((a: any) => a.id));
        const byKey = new Map<string, string>();
        for (const d of [...arms.map((a: any) => a.department), ...students.map((st: any) => st.department)]) {
            const k = normalizeDepartment(d);
            if (k && !byKey.has(k)) byKey.set(k, String(d).trim());
        }
        return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
    }

    // ── Per-action subject add / remove (Academic Levels → Edit Class) ──────
    // The admin picks the arms (same grade) the change applies to. Branch
    // admins are held to their branch by `branchId`; a main admin viewing All
    // Branches passes undefined and may pick arms in any branch of the school.
    private static async resolveTargetClasses(db: any, schoolId: string, branchId: string | undefined, anchorId: string, classIds?: string[]) {
        const branchWhere = branchId && branchId !== 'all' ? { branch_id: branchId } : {};
        const anchor = await db.class.findFirst({
            where: { id: anchorId, school_id: schoolId, deleted_at: null, ...branchWhere },
            select: { id: true, grade: true, branch_id: true }
        });
        if (!anchor) throw new Error('Class not found in your school/branch');
        const ids: string[] = Array.from(new Set((classIds && classIds.length ? classIds : [anchorId]).map(String)));
        const targets = await db.class.findMany({
            where: { id: { in: ids }, school_id: schoolId, grade: anchor.grade, deleted_at: null, ...branchWhere },
            select: { id: true, name: true, section: true, branch_id: true }
        });
        if (targets.length !== ids.length) throw new Error('One or more selected classes were not found at this level in your school/branch');
        return { anchor, targets };
    }

    // Students actively enrolled in the given classes, with their own subject list.
    private static async enrolledStudents(db: any, schoolId: string, classIds: string[]) {
        const enr = await db.studentEnrollment.findMany({
            where: { school_id: schoolId, class_id: { in: classIds }, status: 'Active' },
            select: { student_id: true }
        });
        const ids = Array.from(new Set(enr.map((e: any) => e.student_id)));
        if (!ids.length) return [];
        return db.student.findMany({
            where: { id: { in: ids }, school_id: schoolId },
            select: { id: true, assigned_subjects: true, department: true }
        });
    }

    private static cleanDepartment(d: unknown): string | null {
        const v = String(d ?? '').trim();
        return v && v.toLowerCase() !== 'all' ? v : null;
    }

    private static hasSubject(list: string[] | null | undefined, name: string) {
        const n = name.trim().toLowerCase();
        return (list || []).some(s => String(s).trim().toLowerCase() === n);
    }

    /** How many students in the chosen arms keep a custom subject list without this subject. */
    static async getSubjectAddImpact(schoolId: string, branchId: string | undefined, anchorId: string, classIds: string[] | undefined, subjectName: string, department?: string | null) {
        const name = String(subjectName || '').trim();
        if (!name) throw new Error('Subject name is required');
        const { targets } = await this.resolveTargetClasses(prisma, schoolId, branchId, anchorId, classIds);
        const dept = this.cleanDepartment(department);
        // A department subject only concerns that department's students.
        const students = (await this.enrolledStudents(prisma, schoolId, targets.map((t: any) => t.id)))
            .filter((s: any) => departmentAllows(dept, s.department));
        const custom = students.filter((s: any) => (s.assigned_subjects || []).filter(Boolean).length > 0);
        return {
            classes: targets,
            inheritCount: students.length - custom.length,
            customCount: custom.filter((s: any) => !this.hasSubject(s.assigned_subjects, name)).length,
        };
    }

    static async addSubjectToClasses(
        scope: { schoolId: string; branchId: string | undefined; userId?: string | null },
        anchorId: string,
        input: { subjectId?: string; name?: string; classIds?: string[]; addToCustom?: boolean; department?: string | null }
    ) {
        const { schoolId, branchId, userId } = scope;
        const branch = branchId && branchId !== 'all' ? branchId : null;
        const dept = this.cleanDepartment(input.department);
        const result = await withTenantTransaction({ schoolId, branchId: branch, userId: userId || null }, async (tx) => {
            const { anchor, targets } = await this.resolveTargetClasses(tx, schoolId, branchId, anchorId, input.classIds);

            // Resolve the subject: an existing school subject the admin may see,
            // or a new one created in the class's branch.
            const visible = branch ? { OR: [{ branch_id: branch }, { branch_id: null }] } : {};
            let subject: any = null;
            if (input.subjectId) {
                subject = await tx.subject.findFirst({ where: { id: input.subjectId, school_id: schoolId, deleted_at: null, ...visible } });
                if (!subject) throw new Error('Subject not found in your school/branch');
            } else {
                const name = String(input.name || '').trim();
                if (!name) throw new Error('Subject name is required');
                subject = await tx.subject.findFirst({ where: { school_id: schoolId, deleted_at: null, name: { equals: name, mode: 'insensitive' }, ...visible } })
                    || await tx.subject.create({ data: { school_id: schoolId, branch_id: anchor.branch_id, name, created_by: userId || null } });
            }

            for (const t of targets) {
                await tx.class.update({ where: { id: t.id }, data: { subjects: { connect: { id: subject.id } } } });
                // Department: one row limits the subject to that department in
                // this class; "All departments" clears any earlier limit.
                if (dept) {
                    await tx.classSubjectDepartment.upsert({
                        where: { class_id_subject_id: { class_id: t.id, subject_id: subject.id } },
                        create: { school_id: schoolId, branch_id: t.branch_id, class_id: t.id, subject_id: subject.id, department: dept },
                        update: { department: dept },
                    });
                } else {
                    await tx.classSubjectDepartment.deleteMany({ where: { school_id: schoolId, class_id: t.id, subject_id: subject.id } });
                }
            }

            // Inheriting students (empty list) get it through the class. Custom
            // lists are only touched when the admin said yes, and only for the
            // subject's department.
            let customUpdated = 0;
            if (input.addToCustom) {
                const students = (await this.enrolledStudents(tx, schoolId, targets.map((t: any) => t.id)))
                    .filter((s: any) => departmentAllows(dept, s.department));
                for (const s of students) {
                    const list: string[] = (s.assigned_subjects || []).filter(Boolean);
                    if (list.length === 0 || this.hasSubject(list, subject.name)) continue;
                    await tx.student.update({ where: { id: s.id }, data: { assigned_subjects: [...list, subject.name] } });
                    customUpdated++;
                }
            }

            await tx.auditLog.create({ data: {
                school_id: schoolId, branch_id: branch, user_id: userId || null,
                action: 'class.subject.add', action_type: 'ACADEMIC', entity_type: 'Class', entity_id: anchorId,
                action_description: `Added ${subject.name} to ${targets.map((t: any) => t.name).join(', ')}${dept ? ` (${dept} department only)` : ''}`,
                new_values: { subject_id: subject.id, subject: subject.name, class_ids: targets.map((t: any) => t.id), department: dept } as any,
                metadata: { add_to_custom: !!input.addToCustom, custom_students_updated: customUpdated } as any,
            } });

            return { subject: { id: subject.id, name: subject.name }, classes: targets, customUpdated, department: dept };
        });
        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'subject_add', classIds: result.classes.map((c: any) => c.id) });
        return result;
    }

    /**
     * Unlink a subject from the chosen arms and take it off those students'
     * own subject lists. The Subject row and every result, grade and score
     * recorded for it are left untouched.
     */
    static async removeSubjectFromClasses(
        scope: { schoolId: string; branchId: string | undefined; userId?: string | null },
        anchorId: string,
        subjectId: string,
        classIds?: string[]
    ) {
        const { schoolId, branchId, userId } = scope;
        const branch = branchId && branchId !== 'all' ? branchId : null;
        const result = await withTenantTransaction({ schoolId, branchId: branch, userId: userId || null }, async (tx) => {
            const { targets } = await this.resolveTargetClasses(tx, schoolId, branchId, anchorId, classIds);
            const subject = await tx.subject.findFirst({ where: { id: subjectId, school_id: schoolId } });
            if (!subject) throw new Error('Subject not found in your school/branch');

            for (const t of targets) {
                await tx.class.update({ where: { id: t.id }, data: { subjects: { disconnect: { id: subject.id } } } });
            }
            await tx.classSubjectDepartment.deleteMany({ where: { school_id: schoolId, subject_id: subject.id, class_id: { in: targets.map((t: any) => t.id) } } });

            let studentsUpdated = 0;
            const n = subject.name.trim().toLowerCase();
            const students = await this.enrolledStudents(tx, schoolId, targets.map((t: any) => t.id));
            for (const s of students) {
                const list: string[] = (s.assigned_subjects || []).filter(Boolean);
                if (!this.hasSubject(list, subject.name)) continue;
                await tx.student.update({ where: { id: s.id }, data: { assigned_subjects: list.filter(x => String(x).trim().toLowerCase() !== n) } });
                studentsUpdated++;
            }

            await tx.auditLog.create({ data: {
                school_id: schoolId, branch_id: branch, user_id: userId || null,
                action: 'class.subject.remove', action_type: 'ACADEMIC', entity_type: 'Class', entity_id: anchorId,
                action_description: `Removed ${subject.name} from ${targets.map((t: any) => t.name).join(', ')} (past results kept)`,
                old_values: { subject_id: subject.id, subject: subject.name, class_ids: targets.map((t: any) => t.id) } as any,
                metadata: { custom_students_updated: studentsUpdated } as any,
            } });

            return { subject: { id: subject.id, name: subject.name }, classes: targets, studentsUpdated };
        });
        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'subject_remove', classIds: result.classes.map((c: any) => c.id) });
        return result;
    }

    static async deleteClass(schoolId: string, branchId: string | undefined, id: string) {
        const result = await prisma.class.deleteMany({
            where: { id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) }
        });
        if (result.count === 0) throw new Error('Class not found in your school/branch');
        // Cascade: remove any timetable entries left pointing at the now-deleted class.
        await prisma.timetable.deleteMany({ where: { class_id: id, school_id: schoolId } });

        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'delete', classId: id });
        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'class_deleted', classId: id });
        return true;
    }

    static async getClassSubjects(schoolId: string, grade: number, section: string) {
        const targetClass = await prisma.class.findFirst({
            where: {
                school_id: schoolId,
                grade: grade,
                section: section
            },
            include: {
                subjects: true
            }
        });

        return targetClass?.subjects || [];
    }

    static async getClass(schoolId: string, classId: string, branchId?: string, teacherId?: string) {
        const where: any = {
            id: classId,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId; // strict: untagged rows only in All Branches
        }

        if (teacherId) {
            where.teachers = { some: { teacher_id: teacherId } };
        }

        const cls = await prisma.class.findFirst({
            where,
            include: {
                _count: {
                    select: { enrollments: true }
                }
            }
        });

        if (!cls) return null;

        return {
            ...cls,
            student_count: cls._count.enrollments,
            studentCount: cls._count.enrollments
        };
    }

    static async getClassStudents(schoolId: string, classId: string, branchId?: string, teacherId?: string) {
        const classWhere: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            classWhere.branch_id = branchId; // strict: untagged rows only in All Branches
        }

        if (teacherId) {
            classWhere.teachers = { some: { teacher_id: teacherId } };
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                class_id: classId,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                class: classWhere
            },
            include: {
                student: true
            }
        });

        return enrollments.map((e: any) => ({
            id: e.student.id,
            name: (e.student as any).full_name || e.student.name,
            email: e.student.email,
            grade: e.student.grade,
            section: e.student.section,
            avatar_url: e.student.avatar_url,
            school_generated_id: e.student.school_generated_id,
            attendance_status: e.student.attendance_status,
            gender: e.student.gender,
            phone: e.student.phone,
            birthday: e.student.dob || e.student.birthday || e.student.dateOfBirth,
            status: e.student.status
        }));
    }

    static async initializeStandardClasses(schoolId: string, classes: any[], branchId: string | undefined) {
        const results = [];
        for (const cls of classes) {
            const created = await prisma.class.create({
                data: {
                    name: cls.name,
                    grade: cls.grade,
                    section: cls.section,
                    level_category: cls.level,
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null
                }
            });
            results.push(created);
        }
        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'initialize_standard' });
        return results;
    }
}
