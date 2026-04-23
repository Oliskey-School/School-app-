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
                        allowed_branch_ids: data.allowed_branch_ids || (branchId ? [branchId] : []),
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
                    allowed_branch_ids: data.allowed_branch_ids || (branchId ? [branchId] : []),
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
                    allowed_branch_ids: data.allowed_branch_ids || (branchId ? [branchId] : []),
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
        const teachers = await prisma.teacher.findMany({
            where: {
                school_id: schoolId,
                OR: (branchId && branchId !== 'all') ? [
                    { branch_id: branchId },
                    { branch_id: null }
                ] : undefined
            },
            include: {
                user: true
            },
            orderBy: { full_name: 'asc' }
        });

        // Ensure we use the User account email as source of truth
        return teachers.map(t => ({
            ...t,
            email: t.user?.email || t.email
        }));
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
            // Priority: User account email is source of truth
            const displayEmail = teacher.user?.email || teacher.email;
            
            // Note: Subjects are handled via Class relationships in this schema
            // but for simple profile view, we use subject_specialty mapped to subjects
            return {
                ...teacher,
                email: displayEmail,
                subjects: teacher.subject_specialty
            };
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
            school_generated_id,
            notification_preferences
        } = updates;

        const prismaData: any = {};
        if (name || full_name) prismaData.full_name = name || full_name;
        if (email !== undefined) prismaData.email = email;
        if (phone !== undefined) prismaData.phone = phone;
        if (status !== undefined) prismaData.status = status;
        if (avatar_url !== undefined) prismaData.avatar_url = avatar_url;
        if (curriculum_eligibility !== undefined) prismaData.curriculum_eligibility = curriculum_eligibility;
        
        // Handle both subjects (frontend) and subject_specialty (backend/DB)
        const effectiveSubjects = subject_specialty || updates.subjects;
        if (effectiveSubjects !== undefined) prismaData.subject_specialty = effectiveSubjects;
        
        if (school_generated_id !== undefined) prismaData.school_generated_id = school_generated_id;
        if (notification_preferences !== undefined) prismaData.notification_preferences = notification_preferences;

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

            // Sync email and name to User table if provided and different
            // Sync identity fields to User table for global persistence
            if (email || name || full_name || avatar_url) {
                const userUpdate: any = {};
                if (email) userUpdate.email = email.toLowerCase();
                if (name || full_name) userUpdate.full_name = name || full_name;
                if (avatar_url !== undefined) userUpdate.avatar_url = avatar_url;

                if (teacher.user_id) {
                    await tx.user.update({
                        where: { id: teacher.user_id },
                        data: userUpdate
                    });
                }
            }

            const updatedTeacher = await tx.teacher.update({
                where: { id: teacher.id },
                data: prismaData,
                include: { user: true }
            });

            // Update user record if generated ID changed
            if (school_generated_id !== undefined && updatedTeacher.user_id) {
                await tx.user.update({
                    where: { id: updatedTeacher.user_id },
                    data: { school_generated_id }
                });
            }

            // Update classes if provided
            if (classes && Array.isArray(classes)) {
                await tx.classTeacher.deleteMany({
                    where: { teacher_id: teacher.id }
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

            SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'update', teacherId: teacher.id });
            
            // Return combined data with user email as source of truth
            return {
                ...updatedTeacher,
                email: updatedTeacher.user?.email || updatedTeacher.email
            };
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
        console.log(`🔍 [TeacherService] Fetching profile for user ${userId} in school ${schoolId}`);
        let teacher = await prisma.teacher.findFirst({
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

        // Sync Logic: If teacher name/email/ID doesn't match User name/email/ID, update teacher
        if (teacher && teacher.user) {
            const mismatch = 
                teacher.full_name !== teacher.user.full_name || 
                teacher.email !== teacher.user.email ||
                (teacher.school_generated_id && teacher.user.school_generated_id !== teacher.school_generated_id);

            if (mismatch) {
                console.log(`🔄 [TeacherService] Syncing teacher profile for ${userId} with User data...`);
                teacher = await prisma.teacher.update({
                    where: { id: teacher.id },
                    data: {
                        full_name: teacher.user.full_name,
                        email: teacher.user.email,
                        school_generated_id: teacher.user.school_generated_id || teacher.school_generated_id
                    },
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

                // Sync back to User record if missing ID but Teacher table has it
                if (teacher.school_generated_id && !teacher.user.school_generated_id) {
                    await prisma.user.update({
                        where: { id: teacher.user_id },
                        data: { school_generated_id: teacher.school_generated_id }
                    });
                }
            }
        }

        // Self-Healing: If user is a TEACHER or ADMIN but has no Teacher record, create one
        if (!teacher) {
            console.log(`⚠️ [TeacherService] No teacher record found for user ${userId}. Attempting self-healing...`);
            const user = await prisma.user.findUnique({ where: { id: userId } });
            
            if (!user) {
                console.error(`❌ [TeacherService] User ${userId} not found even for self-healing.`);
                return null;
            }

            // Robust role check (case-insensitive and supports both enum/string)
            const userRole = (user.role as string).toUpperCase();
            const allowedRoles = ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'PROPRIETOR', 'BURSAR', 'COMPLIANCE_OFFICER'];
            
            console.log(`👤 [TeacherService] User role: ${userRole}, School ID: ${user.school_id}, Role allowed: ${allowedRoles.includes(userRole)}`);

            if (allowedRoles.includes(userRole)) {
                console.log(`🛠️ [TeacherService] Self-healing: Creating missing teacher record for user ${userId} (${userRole})`);
                
                // Fallback to arguments if user record is missing IDs (common in some migration states)
                const effectiveSchoolId = user.school_id || schoolId;
                const effectiveBranchId = user.branch_id || (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' ? '7601cbea-e1ba-49d6-b59b-412a584cb94f' : undefined);

                // Try to generate a standard school ID if missing
                let schoolGeneratedId = user.school_generated_id;
                if (!schoolGeneratedId && effectiveSchoolId && effectiveBranchId) {
                    try {
                        schoolGeneratedId = await IdGeneratorService.generateSchoolId(effectiveSchoolId, effectiveBranchId as string, 'teacher');
                    } catch (idErr: any) {
                        console.warn('[TeacherService] Could not generate school ID during self-healing:', idErr.message);
                    }
                }

                teacher = await (prisma.teacher.create as any)({
                    data: {
                        user_id: userId,
                        school_id: effectiveSchoolId,
                        branch_id: effectiveBranchId,
                        school_generated_id: schoolGeneratedId,
                        full_name: user.full_name,
                        email: user.email,
                        status: 'Active',
                        updated_at: new Date()
                    },
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
                console.log(`✅ [TeacherService] Self-healing successful for ${userId}`);
            } else {
                console.warn(`⚠️ [TeacherService] Self-healing skipped: Role ${userRole} not in allowed list.`);
            }
        }
        if (teacher && teacher.classes) {
            // Map subject_specialty to subjects for frontend
            (teacher as any).subjects = teacher.subject_specialty;
            
            // Deduplicate classes based on class_id and subject_id
            const seen = new Set();
            const uniqueClasses = teacher.classes.filter(c => {
                const key = `${c.class_id}-${c.subject_id || 'null'}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            teacher.classes = uniqueClasses;
        }
        return teacher;
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


