import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { IdGeneratorService } from './idGenerator.service';
import { PrismaClient, Role } from '@prisma/client';
import { SocketService } from './socket.service';

export class TeacherService {
    static async createTeacher(schoolId: string, branchId: string | undefined, data: any) {
        const { name, email, phone, subject_specialty, subjects, classes, avatar_url } = data;
        const effectiveSubjects = subject_specialty || subjects || [];

        // 1. Generate standard school ID
        let schoolGeneratedId: string | null = null;
        if (schoolId && branchId) {
            try {
                schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, branchId, 'teacher');
            } catch (idErr: any) {
                console.warn('[TeacherService] Could not generate school ID:', idErr.message);
            }
        }

        // 2. Generate initial password
        const generatedPassword = 'teacher' + Math.floor(1000 + Math.random() * 9000);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        return await prisma.$transaction(async (tx) => {
            // 3. Check if user already exists
            let user = await tx.user.findUnique({
                where: { email: email?.toLowerCase() }
            });

            if (user) {
                // If user exists, ensure they have the TEACHER role
                if (user.role !== Role.TEACHER) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: { role: Role.TEACHER }
                    });
                }
                // Update existing user details if needed
                await tx.user.update({
                    where: { id: user.id },
                    data: {
                        full_name: name,
                        school_id: schoolId,
                        branch_id: branchId || user.branch_id,
                        school_generated_id: schoolGeneratedId || user.school_generated_id
                    }
                });
            } else {
                // Create User if doesn't exist
                user = await tx.user.create({
                    data: {
                        email: email?.toLowerCase() || `${schoolGeneratedId || 'temp_teacher'}@school.com`,
                        password_hash: hashedPassword,
                        full_name: name,
                        role: Role.TEACHER,
                        school_id: schoolId,
                        branch_id: branchId || null,
                        school_generated_id: schoolGeneratedId,
                        initial_password: generatedPassword,
                        email_verified: true // Admin-created teachers are verified by default
                    }
                });
            }

            // 4. Create or Update Teacher Record
            const teacher = await tx.teacher.upsert({
                where: { user_id: user.id },
                create: {
                    user_id: user.id,
                    full_name: name,
                    email: email?.toLowerCase(),
                    phone,
                    avatar_url,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    school_generated_id: schoolGeneratedId,
                    status: 'Active',
                    curriculum_eligibility: data.curriculum_eligibility || ['Nigerian'],
                    subject_specialty: effectiveSubjects
                },
                update: {
                    full_name: name,
                    email: email?.toLowerCase(),
                    phone,
                    avatar_url,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    school_generated_id: schoolGeneratedId,
                    status: 'Active',
                    curriculum_eligibility: data.curriculum_eligibility,
                    subject_specialty: effectiveSubjects
                }
            });

            // 4. Link Subjects/Classes
            if (classes && Array.isArray(classes)) {
                for (const item of classes) {
                    const classId = typeof item === 'string' ? item : item.classId;
                    const subjectId = typeof item === 'string' ? undefined : item.subjectId;

                    const existingClass = await tx.class.findUnique({ where: { id: classId } });
                    if (existingClass) {
                        await (tx.classTeacher.upsert as any)({
                            where: {
                                class_id_teacher_id_subject_id: {
                                    class_id: classId,
                                    teacher_id: teacher.id,
                                    subject_id: subjectId || null
                                }
                            },
                            create: {
                                school: { connect: { id: schoolId } },
                                branch: branchId ? { connect: { id: branchId } } : undefined,
                                teacher: { connect: { id: teacher.id } },
                                class: { connect: { id: classId } },
                                subject: subjectId ? { connect: { id: subjectId } } : undefined,
                                is_primary: false
                            },
                            update: {}
                        });
                    }
                }
            }

            const result = {
                ...teacher,
                initial_password: user.initial_password,
                username: user.school_generated_id || user.email
            };

            SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'create', teacherId: teacher.id });
            return result;
        });
    }

    static async getAllTeachers(schoolId: string, branchId?: string) {
        return await prisma.teacher.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                user: true
            },
            orderBy: { full_name: 'asc' }
        });
    }

    static async getTeacherById(schoolId: string, branchId: string | undefined, id: string) {
        const teacher = await prisma.teacher.findFirst({
            where: {
                id: id,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                user: true,
                classes: {
                    include: {
                        class: true
                    }
                }
            }
        });

        if (teacher) {
            // Note: Subjects are handled via Class relationships in this schema
            return teacher;
        }
        return null;
    }

    static async updateTeacher(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const {
            name,
            full_name,
            email,
            phone,
            status,
            avatar_url,
            curriculum_eligibility,
            subject_specialty,
            classes,
            school_generated_id
        } = updates;

        const prismaData: any = {};
        if (name || full_name) prismaData.full_name = name || full_name;
        if (email !== undefined) prismaData.email = email;
        if (phone !== undefined) prismaData.phone = phone;
        if (status !== undefined) prismaData.status = status;
        if (avatar_url !== undefined) prismaData.avatar_url = avatar_url;
        if (curriculum_eligibility !== undefined) prismaData.curriculum_eligibility = curriculum_eligibility;
        if (subject_specialty !== undefined) prismaData.subject_specialty = subject_specialty;
        if (school_generated_id !== undefined) prismaData.school_generated_id = school_generated_id;

        return await prisma.$transaction(async (tx) => {
            // Find teacher record first to handle cases where id passed is user_id
            const teacher = await tx.teacher.findFirst({
                where: {
                    OR: [
                        { id: id },
                        { user_id: id }
                    ],
                    school_id: schoolId
                }
            });

            if (!teacher) {
                throw new Error('Teacher record not found');
            }

            const updatedTeacher = await tx.teacher.update({
                where: { id: teacher.id },
                data: prismaData
            });

            // Update user record if ID or name changed
            if (school_generated_id !== undefined || name || full_name) {
                const userData: any = {};
                if (school_generated_id !== undefined) userData.school_generated_id = school_generated_id;
                if (name || full_name) userData.full_name = name || full_name;

                if (updatedTeacher.user_id) {
                    await tx.user.update({
                        where: { id: updatedTeacher.user_id },
                        data: userData
                    });
                }
            }

            // Update classes if provided
            if (classes && Array.isArray(classes)) {
                await tx.classTeacher.deleteMany({
                    where: { teacher_id: id }
                });

                for (const item of classes) {
                    const classId = typeof item === 'string' ? item : item.classId;
                    const subjectId = typeof item === 'string' ? undefined : item.subjectId;

                    // Check if class exists to prevent foreign key errors
                    const existingClass = await tx.class.findUnique({ where: { id: classId } });
                    if (existingClass) {
                        await tx.classTeacher.create({
                            data: {
                                school: { connect: { id: schoolId } },
                                branch: branchId ? { connect: { id: branchId } } : undefined,
                                teacher: { connect: { id: teacher.id } },
                                class: { connect: { id: classId } },
                                subject: subjectId ? { connect: { id: subjectId } } : undefined,
                                is_primary: false
                            }
                        });
                    }
                }
            }

            SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'update', teacherId: id });
            return updatedTeacher;
        });
    }

    static async deleteTeacher(schoolId: string, branchId: string | undefined, id: string) {
        const teacher = await prisma.teacher.findUnique({ where: { id } });
        if (teacher && teacher.user_id) {
            await prisma.user.delete({ where: { id: teacher.user_id } });
        } else if (teacher) {
            await prisma.teacher.delete({ where: { id: teacher.id } });
        }

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'delete', teacherId: id });
        return true;
    }

    static async submitMyAttendance(schoolId: string, branchId: string | undefined, userId: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { user_id: userId, school_id: schoolId }
        });

        if (!teacher) throw new Error('Teacher record not found');

        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const checkIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        const existing = await prisma.teacherAttendance.findUnique({
            where: {
                teacher_id_date: {
                    teacher_id: teacher.id,
                    date: date
                }
            }
        });

        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        let result;
        if (!existing) {
            // First activity of the day: Check-in
            result = await prisma.teacherAttendance.create({
                data: {
                    teacher_id: teacher.id,
                    school_id: schoolId,
                    branch_id: branchId || teacher.branch_id,
                    date: date,
                    status: 'present',
                    approval_status: 'pending',
                    check_in: timeString
                }
            });
        } else if (!existing.check_out) {
            // Already checked in, now checking out
            result = await prisma.teacherAttendance.update({
                where: { id: existing.id },
                data: {
                    check_out: timeString,
                    status: 'present'
                }
            });
        } else {
            // Already checked out, maybe re-checking in? Let's just update check-in for now
            // or we could allow multiple check-ins if needed, but the schema is 1 per day.
            result = await prisma.teacherAttendance.update({
                where: { id: existing.id },
                data: {
                    check_in: timeString,
                    check_out: null, // Reset check-out on re-check-in
                    status: 'present'
                }
            });
        }

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'attendance_submit', teacherId: teacher.id });
        return result;
    }

    static async getMyAttendanceHistory(schoolId: string, branchId: string | undefined, userId: string, limit: number = 30) {
        const teacher = await prisma.teacher.findFirst({
            where: { user_id: userId, school_id: schoolId }
        });

        if (!teacher) return [];

        return await prisma.teacherAttendance.findMany({
            where: { teacher_id: teacher.id },
            orderBy: { date: 'desc' },
            take: limit
        });
    }

    static async getTeacherAttendance(schoolId: string, branchId: string | undefined, filters: { date?: string; status?: string; teacher_id?: string; startDate?: string; endDate?: string }) {
        return await prisma.teacherAttendance.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                teacher_id: filters.teacher_id,
                approval_status: filters.status,
                AND: [
                    filters.date ? { date: filters.date } : {},
                    filters.startDate ? { date: { gte: filters.startDate } } : {},
                    filters.endDate ? { date: { lte: filters.endDate } } : {}
                ]
            },
            include: {
                teacher: true
            },
            orderBy: { date: 'desc' }
        });
    }

    static async getTeacherProfileByUserId(schoolId: string, userId: string) {
        return await prisma.teacher.findFirst({
            where: { user_id: userId, school_id: schoolId },
            include: { 
                user: true,
                classes: {
                    include: {
                        class: true,
                        subject: true
                    }
                }
            }
        });
    }

    static async saveTeacherAttendance(schoolId: string, branchId: string | undefined, records: any[]) {
        const results = [];
        for (const record of records) {
            const result = await prisma.teacherAttendance.upsert({
                where: {
                    teacher_id_date: {
                        teacher_id: record.teacher_id,
                        date: record.date
                    }
                },
                create: {
                    teacher_id: record.teacher_id,
                    school_id: schoolId,
                    branch_id: branchId || record.branch_id || null,
                    date: record.date,
                    status: record.status,
                    approval_status: record.approval_status || 'approved',
                    check_in: record.check_in,
                    check_out: record.check_out
                },
                update: {
                    status: record.status,
                    approval_status: record.approval_status || 'approved',
                    check_in: record.check_in,
                    check_out: record.check_out
                }
            });
            results.push(result);
        }
        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'attendance_bulk_save' });
        return results;
    }

    static async approveTeacherAttendance(schoolId: string, attendanceId: string, status: 'approved' | 'rejected') {
        const result = await prisma.teacherAttendance.update({
            where: { id: attendanceId, school_id: schoolId },
            data: { approval_status: status }
        });

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'attendance_approve', attendanceId });
        return result;
    }

    /**
     * Get students with their login credentials for teachers
     * Teachers can see credentials for students in their classes (Approved only)
     */
    static async getStudentsWithCredentials(schoolId: string, branchId: string | undefined, teacherId: string) {
        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId }
        });

        if (!teacher) {
            throw new Error('Teacher not found');
        }

        const classTeachers = await prisma.classTeacher.findMany({
            where: { teacher_id: teacherId },
            include: {
                class: true
            }
        });

        const studentsWithCredentials: any[] = [];
        const seenStudentIds = new Set();

        for (const classTeacher of classTeachers) {
            const enrollments = await prisma.studentEnrollment.findMany({
                where: { class_id: classTeacher.class_id },
                include: {
                    student: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            for (const enrollment of enrollments) {
                const student = enrollment.student;
                
                if (seenStudentIds.has(student.id)) continue;
                seenStudentIds.add(student.id);

                studentsWithCredentials.push({
                    id: student.id,
                    full_name: student.full_name,
                    email: student.email,
                    school_generated_id: student.school_generated_id,
                    status: student.status,
                    grade: student.grade,
                    section: student.section,
                    class_name: classTeacher.class.name,
                    class_id: classTeacher.class_id,
                    credentials: student.status === 'Active' ? {
                        login_id: student.school_generated_id || student.email,
                        has_password: !!student.user?.initial_password,
                        password: student.user?.initial_password || null
                    } : null,
                    created_at: student.created_at
                });
            }
        }

        return studentsWithCredentials;
    }

    /**
     * Get pending students that need approval (for admin dashboard)
     */
    static async getPendingStudentsForSchool(schoolId: string, branchId: string | undefined) {
        return await prisma.student.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                status: 'Pending'
            },
            include: {
                user: true
            },
            orderBy: { created_at: 'desc' }
        });
    }
    /**
     * Get appointments for a teacher
     */
    static async getTeacherAppointments(schoolId: string, branchId: string | undefined, teacherId: string) {
        return await prisma.appointment.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                teacher_id: teacherId
            },
            orderBy: { date: 'desc' }
        });
    }

    /**
     * Update appointment status
     */
    static async updateAppointmentStatus(schoolId: string, appointmentId: string, status: string) {
        const result = await prisma.appointment.update({
            where: { 
                id: appointmentId,
                school_id: schoolId 
            },
            data: { 
                status: status,
                updated_at: new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'appointment_status', appointmentId });
        return result;
    }

    static async getTeacherBadges(userId: string) {
        const teacher = await prisma.teacher.findFirst({ where: { user_id: userId } });
        if (!teacher) return { badges: [], totalPoints: 0 };

        const allBadges = await prisma.pDBadge.findMany();
        const earnedBadges = await prisma.teacherBadge.findMany({ where: { teacher_id: teacher.id } });
        
        const earnedMap = new Map(earnedBadges.map(b => [b.badge_id, b.earned_at]));
        
        const badges = allBadges.map(b => ({
            ...b,
            is_earned: earnedMap.has(b.id),
            earned_at: earnedMap.get(b.id)
        }));

        const totalPoints = badges.filter(b => b.is_earned).reduce((s, b) => s + (b.points || 0), 0);
        return { badges, totalPoints };
    }

    static async getTeacherRecognitions(schoolId: string, userId: string) {
        const teacher = await prisma.teacher.findFirst({ where: { user_id: userId } });
        if (!teacher) return { recognitions: [], myPoints: 0 };

        const recs = await prisma.teacherRecognition.findMany({
            where: { is_public: true },
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
                teacher: { select: { full_name: true } },
                recognizer: { select: { full_name: true } }
            }
        });

        const myRecs = await prisma.teacherRecognition.findMany({ where: { teacher_id: teacher.id } });
        const myPoints = myRecs.reduce((s, r) => s + (r.points || 0), 0);

        const recognitions = recs.map(r => ({
            ...r,
            teacher_name: r.teacher?.full_name || 'Unknown',
            recognized_by_name: r.recognizer?.full_name || 'Anonymous'
        }));

        return { recognitions, myPoints };
    }

    static async getMentoringMatches(schoolId: string, userId: string) {
        const teacher = await prisma.teacher.findFirst({ where: { user_id: userId, school_id: schoolId } });
        if (!teacher) return { teachers: [], myMatches: [] };

        const teachers = await prisma.teacher.findMany({
            where: { school_id: schoolId, id: { not: teacher.id } },
            select: { id: true, full_name: true, email: true },
            take: 50
        });

        const matches = await prisma.mentoringMatch.findMany({
            where: {
                OR: [{ mentor_id: teacher.id }, { mentee_id: teacher.id }],
                status: 'Active'
            },
            include: {
                mentor: { select: { full_name: true } },
                mentee: { select: { full_name: true } }
            }
        });

        const myMatches = matches.map(m => ({
            ...m,
            mentor_name: m.mentor?.full_name || 'Unknown',
            mentee_name: m.mentee?.full_name || 'Unknown',
            is_mentor: m.mentor_id === teacher.id
        }));

        return { teachers, myMatches };
    }

    static async createMentoringMatch(userId: string, data: { mentor_id: string, subject_area: string }) {
        const teacher = await prisma.teacher.findFirst({ where: { user_id: userId } });
        if (!teacher) throw new Error('Teacher not found');

        return await prisma.mentoringMatch.create({
            data: {
                mentor_id: data.mentor_id,
                mentee_id: teacher.id,
                subject_area: data.subject_area,
                status: 'Active'
            }
        });
    }

    static async getTeacherCertificates(teacherId: string) {
        const certs = await prisma.pDCertificate.findMany({
            where: { teacher_id: teacherId },
            orderBy: { issued_at: 'desc' },
            include: { pd_course: { select: { title: true } } }
        });

        return certs.map(c => ({
            ...c,
            course_title: c.pd_course?.title || 'Unknown Course'
        }));
    }

    static async getSubstituteRequests(schoolId: string, branchId?: string) {
        return await prisma.substituteAssignment.findMany({
            where: {
                school_id: schoolId,
                status: 'Pending'
            },
            orderBy: { date: 'asc' }
        });
    }

    static async createSubstituteRequest(schoolId: string, teacherId: string, data: any) {
        const result = await prisma.substituteAssignment.create({
            data: {
                school_id: schoolId,
                original_teacher_id: teacherId,
                substitute_teacher_id: data.substitute_teacher_id,
                class_id: data.class_id,
                subject_id: data.subject_id,
                date: new Date(data.date),
                status: 'Pending'
            }
        });

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'substitute_request', requestId: result.id });
        return result;
    }
}


