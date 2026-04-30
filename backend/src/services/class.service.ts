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
                whereClause.OR = [
                    { branch_id: branchId },
                    { branch_id: null }
                ];
            }

            let classes;
            try {
                classes = await prisma.class.findMany({
                    where: whereClause,
                    include: {
                        _count: {
                            select: { enrollments: true }
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

    static async createClass(schoolId: string, branchId: string | undefined, classData: any) {
        const { level, ...rest } = classData;
        const result = await prisma.class.create({
            data: {
                ...rest,
                level_category: level || rest.level_category,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null
            }
        });
        
        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'create', classId: result.id });
        return result;
    }

    static async updateClass(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const { level, ...rest } = updates;
        const result = await prisma.class.update({
            where: { id: id },
            data: {
                ...rest,
                level_category: level || rest.level_category
            }
        });

        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'update', classId: id });
        return result;
    }

    static async deleteClass(schoolId: string, branchId: string | undefined, id: string) {
        await prisma.class.delete({
            where: { id: id }
        });
        
        SocketService.emitToSchool(schoolId, 'class:updated', { action: 'delete', classId: id });
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

    static async getClass(schoolId: string, classId: string) {
        const cls = await prisma.class.findFirst({
            where: {
                id: classId,
                school_id: schoolId
            },
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

    static async getClassStudents(schoolId: string, classId: string) {
        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                class_id: classId,
                class: {
                    school_id: schoolId
                }
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
