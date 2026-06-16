import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { IdGeneratorService } from './idGenerator.service';
import { BranchIdentityService } from './branchIdentity.service';
import { PrismaClient, Role } from '../../generated/prisma-client';
import { SocketService } from './socket.service';
import { config } from '../config/env';
import { canEditTeacherIdentity, canAssignTeacherToBranch, canAssignTeacherClassesInBranch, forbidden, RequesterLike } from '../utils/permissions';

export class TeacherService {
    static async createTeacher(schoolId: string, branchId: string | undefined, data: any) {
        const { 
            name, full_name, email, phone, status, avatar_url,
            curriculum_type, curriculum_eligibility, 
            subject_specialty, subjects, classes,
            trcn_certificate, degree_certificate, british_qualification
        } = data;
        const effectiveName = full_name || name;
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
            // 3. Check if a user with this email already exists IN THIS SCHOOL + BRANCH
            //    (email is unique per school+branch, not globally).
            let user = await tx.user.findFirst({
                where: { email: email?.toLowerCase(), school_id: schoolId, branch_id: branchId ?? null }
            });

            // An email belongs to exactly ONE person IN THIS BRANCH. If it already exists we do NOT
            // hijack/convert that account (the old behaviour silently flipped a parent
            // into a teacher and replaced their ID — making the original person vanish
            // from their list). Reject with a clear message so each user keeps their own
            // account + unique ID, and the shown credentials always belong to this new user.
            if (user) {
                throw Object.assign(
                    new Error(`This email is already registered to ${user.full_name || 'another account'}. Please use a different email.`),
                    { status: 409 }
                );
            }

            // Create the new teacher user. Admin-created teachers are verified immediately
            // so they can sign in right away with the generated credentials.
            user = await tx.user.create({
                data: {
                    email: email?.toLowerCase() || `${schoolGeneratedId || 'temp_teacher'}@school.com`,
                    password_hash: hashedPassword,
                    full_name: effectiveName,
                    role: Role.TEACHER,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    allowed_branch_ids: data.allowed_branch_ids || (branchId ? [branchId] : []),
                    school_generated_id: schoolGeneratedId,
                    initial_password: generatedPassword,
                    avatar_url: avatar_url || null,
                    email_verified: true
                }
            });

            // 4. Create or Update Teacher Record
            const teacher = await tx.teacher.upsert({
                where: { user_id: user.id },
                create: {
                    user_id: user.id,
                    full_name: effectiveName,
                    email: email?.toLowerCase(),
                    phone,
                    avatar_url,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    allowed_branch_ids: data.allowed_branch_ids || (branchId ? [branchId] : []),
                    school_generated_id: schoolGeneratedId,
                    status: status || 'Active',
                    curriculum_type: curriculum_type || 'Nigerian',
                    curriculum_eligibility: curriculum_eligibility || (curriculum_type ? [curriculum_type] : ['Nigerian']),
                    subject_specialty: effectiveSubjects,
                    trcn_certificate,
                    degree_certificate,
                    british_qualification
                },
                update: {
                    full_name: effectiveName,
                    email: email?.toLowerCase(),
                    phone,
                    avatar_url,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    allowed_branch_ids: data.allowed_branch_ids || (branchId ? [branchId] : []),
                    school_generated_id: schoolGeneratedId,
                    status: status || 'Active',
                    curriculum_type: curriculum_type,
                    curriculum_eligibility: curriculum_eligibility,
                    subject_specialty: effectiveSubjects,
                    trcn_certificate,
                    degree_certificate,
                    british_qualification
                }
            });

            // 4. Link Subjects/Classes
            if (classes && Array.isArray(classes)) {
                const seenAssignments = new Set<string>();
                for (const item of classes) {
                    let classId = typeof item === 'string' ? item : item.classId;
                    const subjectId = typeof item === 'string' ? undefined : item.subjectId;
                    
                    const assignmentKey = `${classId}:${subjectId || 'none'}`;
                    if (seenAssignments.has(assignmentKey)) continue;
                    seenAssignments.add(assignmentKey);

                    if (classId && typeof classId === 'string' && classId.startsWith('std-')) {
                        const parts = classId.split('-'); // std-grade-section
                        const grade = parseInt(parts[1]);
                        const section = parts[2];

                        if (isNaN(grade)) {
                            console.error(`❌ [TeacherService] Invalid grade parsed from classId: ${classId}`);
                            continue; // Skip this invalid class assignment
                        }

                        let cls = await tx.class.findFirst({
                            where: { school_id: schoolId, grade, section }
                        });

                        if (!cls) {
                            console.log(`📝 [TeacherService] Creating missing class: Grade ${grade}, Section ${section}`);
                            cls = await tx.class.create({
                                data: {
                                    school_id: schoolId,
                                    branch_id: branchId || null,
                                    grade,
                                    section,
                                    name: `Grade ${grade}`, // More readable default name
                                    level_category: grade >= 7 ? 'Secondary' : (grade >= 1 ? 'Primary' : 'Pre-Primary')
                                }
                            });
                        }
                        classId = cls.id;
                    }

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
                // Include teachers whose PRIMARY branch is this branch OR who were
                // assigned to it (allowed_branch_ids), so the staff list matches the
                // staff count and a multi-branch teacher appears in each of theirs.
                ...((branchId && branchId !== 'all') ? {
                    OR: [
                        { branch_id: branchId },
                        { allowed_branch_ids: { has: branchId } }
                    ]
                } : {})
            },
            include: {
                user: true
            },
            orderBy: { full_name: 'asc' }
        });

        // Show each teacher's Global ID FOR THE ACTIVE BRANCH. A teacher whose
        // PRIMARY branch is this branch keeps their stored id; one who is merely
        // ASSIGNED here (allowed_branch_ids) is shown with THIS branch's id (e.g.
        // OLISKEY_LEKKI_TCH_xxxx in Lekki) instead of their home/Main id — so a
        // Main teacher assigned to Lekki never appears as "MAIN_TCH" in Lekki.
        const scoped = branchId && branchId !== 'all';
        // SEQUENTIAL: allocate per-branch ids one-by-one so each teacher gets a
        // distinct number. Parallel resolution let two teachers grab the same id.
        const out: any[] = [];
        for (const t of teachers as any[]) {
            let displayId = t.school_generated_id;
            if (scoped && t.branch_id !== branchId && t.user_id) {
                try {
                    displayId = await BranchIdentityService.resolveForUser(
                        { id: t.user_id, school_id: schoolId, branch_id: t.branch_id, school_generated_id: t.school_generated_id, role: 'TEACHER' },
                        branchId
                    );
                } catch { /* keep home id on failure */ }
            }
            out.push({
                ...t,
                email: t.user?.email || t.email,
                school_generated_id: displayId,
                user: t.user ? { ...t.user, school_generated_id: displayId } : t.user,
            });
        }
        return out;
    }

    static async getTeacherById(schoolId: string, branchId: string | undefined, id: string) {
        const teacher = await prisma.teacher.findFirst({
            where: {
                id: id,
                school_id: schoolId,
                // Strict branch isolation: only this branch (untagged → All Branches only).
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
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

    static async updateTeacher(schoolId: string, branchId: string | undefined, id: string, updates: any, requester?: RequesterLike) {
        const {
            name,
            full_name,
            email,
            phone,
            status,
            avatar_url,
            curriculum_type,
            curriculum_eligibility,
            subject_specialty,
            classes,
            school_generated_id,
            notification_preferences,
            allowed_branch_ids,
            trcn_certificate,
            degree_certificate,
            british_qualification,
            compliance_documents
        } = updates;

        const prismaData: any = {};
        if (name || full_name) prismaData.full_name = name || full_name;
        if (email !== undefined) prismaData.email = email;
        if (phone !== undefined) prismaData.phone = phone;
        if (status !== undefined) prismaData.status = status;
        if (avatar_url !== undefined) prismaData.avatar_url = avatar_url;
        if (curriculum_type !== undefined) prismaData.curriculum_type = curriculum_type;
        if (curriculum_eligibility !== undefined) prismaData.curriculum_eligibility = curriculum_eligibility;
        if (allowed_branch_ids !== undefined) prismaData.allowed_branch_ids = allowed_branch_ids;
        if (trcn_certificate !== undefined) prismaData.trcn_certificate = trcn_certificate;
        if (degree_certificate !== undefined) prismaData.degree_certificate = degree_certificate;
        if (british_qualification !== undefined) prismaData.british_qualification = british_qualification;
        if (compliance_documents !== undefined) prismaData.compliance_documents = compliance_documents;
        
        // Handle both subjects (frontend) and subject_specialty (backend/DB)
        const effectiveSubjects = subject_specialty || updates.subjects;
        if (effectiveSubjects !== undefined) {
            prismaData.subject_specialty = Array.from(new Set(Array.isArray(effectiveSubjects) ? effectiveSubjects : []));
        }
        
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

            // Branch governance: the teacher RECORD (identity + qualifications + photo +
            // login + allowed branches) is owned by the teacher's HOME branch and the
            // Main Admin. A branch admin the teacher is merely assigned to manages their
            // classes/subjects (ClassTeacher) and scheduling (Timetable) instead — they
            // cannot edit the teacher record here.
            if (requester && !canEditTeacherIdentity(requester, teacher)) {
                throw forbidden("This teacher's profile is managed by their home branch or the main admin. You can assign their classes, subjects and timetable, but not edit their details.");
            }
            // Lending to additional branches is likewise main-admin / home-branch only.
            if (allowed_branch_ids !== undefined && requester && !canAssignTeacherToBranch(requester, teacher)) {
                throw forbidden('Only the main admin or the teacher\'s home branch can change which branches a teacher is assigned to.');
            }

            // Sync identity fields to the User table for global persistence. The
            // assigned branches MUST be synced here too: the auth token / branch
            // switcher read allowed_branch_ids from the USER row, not the Teacher
            // row, so without this a multi-branch assignment never reaches the
            // teacher's session and their switcher only shows their home branch.
            if (email || name || full_name || avatar_url || allowed_branch_ids !== undefined) {
                const userUpdate: any = {};
                if (email) userUpdate.email = email.toLowerCase();
                if (name || full_name) userUpdate.full_name = name || full_name;
                if (avatar_url !== undefined) userUpdate.avatar_url = avatar_url;
                if (allowed_branch_ids !== undefined) {
                    userUpdate.allowed_branch_ids = Array.isArray(allowed_branch_ids) ? allowed_branch_ids : [];
                }

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

                const seenAssignments = new Set<string>();
                for (const item of classes) {
                    let classId = typeof item === 'string' ? item : item.classId;
                    const subjectId = typeof item === 'string' ? undefined : item.subjectId;
                    
                    const assignmentKey = `${classId}:${subjectId || 'none'}`;
                    if (seenAssignments.has(assignmentKey)) continue;
                    seenAssignments.add(assignmentKey);

                    // Handle Virtual/Shell Class IDs (Implicit Creation)
                    if (classId && classId.startsWith('std-')) {
                        const parts = classId.split('-');
                        const grade = parseInt(parts[1]);
                        const section = parts[2];

                        let cls = await tx.class.findFirst({
                            where: { school_id: schoolId, grade, section }
                        });

                        if (!cls) {
                            cls = await tx.class.create({
                                data: {
                                    school_id: schoolId,
                                    branch_id: branchId || null,
                                    grade,
                                    section,
                                    name: parts[1],
                                    level_category: grade >= 7 ? 'Secondary' : (grade >= 1 ? 'Primary' : 'Pre-Primary')
                                }
                            });
                        }
                        classId = cls.id;
                    }

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

    /**
     * Assign a teacher to classes/subjects WITHIN one branch — without touching their
     * identity or their assignments in any OTHER branch. A branch admin uses this to give
     * a lent teacher branch-specific classes; the teacher then sees them when working in
     * that branch. `classes` is [{ classId, subjectId? }] (or plain class id strings).
     */
    static async assignBranchClasses(schoolId: string, branchId: string | undefined, id: string, classes: any[], requester?: RequesterLike) {
        if (!branchId || branchId === 'all') throw forbidden('Select a specific branch before assigning classes to a teacher.');

        return await prisma.$transaction(async (tx) => {
            const teacher = await tx.teacher.findFirst({ where: { OR: [{ id }, { user_id: id }], school_id: schoolId } });
            if (!teacher) throw new Error('Teacher record not found');

            if (requester && !canAssignTeacherClassesInBranch(requester, teacher, branchId)) {
                throw forbidden('You can only assign classes/subjects for a teacher who is assigned to your branch.');
            }

            // Replace ONLY this branch's assignments for this teacher.
            await tx.classTeacher.deleteMany({ where: { teacher_id: teacher.id, branch_id: branchId } });

            const seen = new Set<string>();
            for (const item of (Array.isArray(classes) ? classes : [])) {
                const classId = typeof item === 'string' ? item : item?.classId;
                const subjectId = typeof item === 'string' ? undefined : item?.subjectId;
                if (!classId) continue;
                const key = `${classId}:${subjectId || 'none'}`;
                if (seen.has(key)) continue;
                seen.add(key);

                // The class must belong to THIS branch (you can only assign your branch's classes).
                const cls = await tx.class.findFirst({ where: { id: classId, school_id: schoolId, branch_id: branchId } });
                if (!cls) continue;
                await tx.classTeacher.create({
                    data: {
                        school: { connect: { id: schoolId } },
                        branch: { connect: { id: branchId } },
                        teacher: { connect: { id: teacher.id } },
                        class: { connect: { id: classId } },
                        subject: subjectId ? { connect: { id: subjectId } } : undefined,
                        is_primary: false,
                    },
                });
            }

            SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'branch-classes', teacherId: teacher.id, branchId });
            const rows = await tx.classTeacher.findMany({ where: { teacher_id: teacher.id, branch_id: branchId }, include: { class: true, subject: true } });
            return { teacher_id: teacher.id, branch_id: branchId, assignments: rows };
        });
    }

    static async deleteTeacher(schoolId: string, branchId: string | undefined, id: string) {
        // Tenant-scoped lookup prevents cross-school deletion via known teacher id.
        const teacher = await prisma.teacher.findFirst({ where: { id, school_id: schoolId } });
        if (!teacher) {
            const err: any = new Error('Teacher not found');
            err.statusCode = 404;
            throw err;
        }
        if (teacher.user_id) {
            await prisma.user.delete({ where: { id: teacher.user_id } });
        } else {
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

        // Per-branch: a teacher checking in while focused on Lekki gets a SEPARATE
        // record from their Main check-in (the unique key now includes branch_id).
        // Without this, the day's single (teacher,date) row belonged to whichever
        // branch checked in first, so a Lekki mark silently updated the Main row and
        // never appeared in Lekki.
        const effectiveBranch = branchId || teacher.branch_id;
        const existing = await prisma.teacherAttendance.findFirst({
            where: {
                teacher_id: teacher.id,
                date: date,
                branch_id: effectiveBranch
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

        // Scope to the ACTIVE branch so a multi-branch teacher's check-ins in Main
        // don't also appear under Lekki (and vice-versa). Without this the history was
        // identical in every branch.
        return await prisma.teacherAttendance.findMany({
            where: {
                teacher_id: teacher.id,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
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
        // Use findUnique by user_id to ensure we always find the record if it exists
        // This is more robust as user_id is the global unique identifier for a teacher
        let teacher = await prisma.teacher.findUnique({
            where: { user_id: userId },
            include: { 
                user: {
                    include: {
                        school: true,
                        branch: true
                    }
                },
                classes: {
                    include: {
                        class: {
                            include: {
                                _count: {
                                    select: { enrollments: true }
                                }
                            }
                        },
                        subject: true
                    }
                }
            }
        });

        // Migration/Self-Healing: If teacher exists but school_id doesn't match current request,
        // it means the teacher might have moved schools or the school context in JWT is slightly outdated.
        if (teacher && teacher.school_id !== schoolId && schoolId) {
            console.warn(`🔄 [TeacherService] School mismatch for teacher ${teacher.id} (DB: ${teacher.school_id}, Req: ${schoolId}). Updating...`);
            teacher = await prisma.teacher.update({
                where: { id: teacher.id },
                data: { school_id: schoolId },
                include: {
                    user: {
                        include: {
                            school: true,
                            branch: true
                        }
                    },
                    classes: {
                        include: {
                            class: {
                                include: {
                                    _count: {
                                        select: { enrollments: true }
                                    }
                                }
                            },
                            subject: true
                        }
                    }
                }
            });
        }

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
                        avatar_url: teacher.user.avatar_url || teacher.avatar_url,
                        school_generated_id: teacher.user.school_generated_id || teacher.school_generated_id
                    },
                    include: { 
                        user: {
                            include: {
                                school: true,
                                branch: true
                            }
                        },
                        classes: {
                            include: {
                                class: {
                                    include: {
                                        _count: {
                                            select: { enrollments: true }
                                        }
                                    }
                                },
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
                const effectiveBranchId = user.branch_id
                    || (config.demoSchoolId && effectiveSchoolId === config.demoSchoolId ? config.demoBranchId : undefined);

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
            
            // Map student count to a flat field for frontend consumption
            const mappedClasses = teacher.classes.map(c => ({
                ...c,
                class: {
                    ...c.class,
                    student_count: (c.class as any)._count?.enrollments || 0
                }
            }));

            // Deduplicate classes based on class_id and subject_id
            const seen = new Set();
            const uniqueClasses = mappedClasses.filter(c => {
                const key = `${c.class_id}-${c.subject_id || 'null'}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            teacher.classes = uniqueClasses as any;
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
            // Only the teacher's classes IN THE ACTIVE BRANCH, so "My Students" doesn't
            // pull in students from classes the teacher runs in another branch.
            where: {
                teacher_id: teacherId,
                ...(branchId && branchId !== 'all' ? { class: { branch_id: branchId } } : {})
            },
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
                status: 'Active',
                school_id: teacher.school_id,
                branch_id: teacher.branch_id
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
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                status: 'Pending'
            },
            orderBy: { date: 'asc' }
        });
    }

    static async createSubstituteRequest(schoolId: string, userId: string, data: any) {
        // Resolve the requesting teacher so we store the teacher id (not the user id)
        // and stamp the request with the teacher's branch for per-branch isolation.
        const teacher = await prisma.teacher.findFirst({ where: { user_id: userId, school_id: schoolId } });
        const result = await prisma.substituteAssignment.create({
            data: {
                school_id: schoolId,
                branch_id: data.branch_id || teacher?.branch_id || null,
                original_teacher_id: teacher?.id || userId,
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

    static async getTeacherEvaluation(schoolId: string, teacherId: string) {
        return await (prisma as any).teacherEvaluation.findFirst({
            where: { school_id: schoolId, teacher_id: teacherId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async submitTeacherEvaluation(schoolId: string, teacherId: string, data: any) {
        const { rating, feedback, performance_data } = data;
        const result = await (prisma as any).teacherEvaluation.create({
            data: {
                school_id: schoolId,
                teacher_id: teacherId,
                rating: rating || 0,
                feedback: feedback || '',
                performance_data: performance_data || null
            }
        });

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'evaluation_submit', teacherId });
        return result;
    }

    static async getTeacherPerformance(schoolId: string, teacherId: string) {
        // This could be more complex, but for now we'll return the latest performance_data
        // or a mock aggregation if none exists.
        const evaluation = await (prisma as any).teacherEvaluation.findFirst({
            where: { school_id: schoolId, teacher_id: teacherId },
            orderBy: { created_at: 'desc' }
        });

        if (evaluation && evaluation.performance_data) {
            return { data: evaluation.performance_data };
        }

        // Fallback mock data if none exists yet
        return { data: [65, 78, 82] }; 
    }
}


