import prisma from '../config/database';
import { SocketService } from './socket.service';

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

            return classes.map((cls: any) => ({
                ...cls,
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
        return cls?.subjects || [];
    }

    static async deleteClass(schoolId: string, branchId: string | undefined, id: string) {
        // Cascade: remove timetable entries for this class before deleting it
        await prisma.timetable.deleteMany({ where: { class_id: id, school_id: schoolId } });
        await prisma.class.delete({ where: { id: id } });

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
