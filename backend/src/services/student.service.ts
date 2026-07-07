import prisma from '../config/database';
import { NotificationService } from './notification.service';
import { IdGeneratorService } from './idGenerator.service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { SocketService } from './socket.service';

export class StudentService {
    static async enrollStudent(schoolId: string, branchId: string | undefined, enrollmentData: any, creatorRole: string, creatorId?: string) {
        const {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            parentName,
            parentEmail,
            parentPhone,
            parentAddress,
            parentId: existingParentId,
            curriculumType,
            documentUrls
        } = enrollmentData;

        if (!firstName || !lastName) {
            throw new Error('First name and last name are required for enrollment.');
        }

        const roleString = (creatorRole || '').toUpperCase();
        const isTeacherAdded = roleString === 'TEACHER';
        const initialStatus = isTeacherAdded ? 'Pending' : (enrollmentData.status || 'Active');

        const fullName = `${firstName} ${lastName}`;
        const studentEmail = enrollmentData.email?.toLowerCase() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Date.now()}@student.school.com`;
        // Profile photo: the Add Student screen sends it as avatar_url / avatarUrl, and
        // (for back-compat) inside documentUrls.passportPhoto. Persist it on BOTH the
        // user row and the student row so it shows in headers, lists and the profile.
        const incomingAvatar = enrollmentData.avatar_url || enrollmentData.avatarUrl
            || enrollmentData.documentUrls?.passportPhoto || null;
        
        // Use a dummy password if pending, strong 16-char hex if active
        const generatedPassword = isTeacherAdded ? 'pending' : (enrollmentData.password || crypto.randomBytes(8).toString('hex'));
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        return await prisma.$transaction(async (tx) => {
            // Always check for duplicate email — covers both typed and auto-generated addresses.
            const existing = await tx.user.findFirst({ where: { email: studentEmail, school_id: schoolId } });
            if (existing) {
                throw Object.assign(
                    new Error(`Email ${studentEmail} is already registered to another account. Please use a different email.`),
                    { status: 409 }
                );
            }

            // 1. Create the User. The email is unique per school+branch and the duplicate
            //    check above already rejected a clash in this branch, so this is a create.
            const user = await (tx.user.create as any)({
                data: {
                    email: studentEmail,
                    password_hash: hashedPassword,
                    full_name: fullName,
                    role: Role.STUDENT,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    email_verified: true, // System created accounts should be pre-verified
                    initial_password: isTeacherAdded ? null : generatedPassword,
                    avatar_url: incomingAvatar,
                    updated_at: new Date()
                }
            });

            // 2. Generate School ID (only if not pending)
            let schoolGeneratedId: string | null = null;
            let admissionNumber = enrollmentData.admission_number || enrollmentData.admissionNumber;

            // Resolve branchId from school's first branch when caller didn't supply one
            let resolvedBranchId = branchId;
            if (!resolvedBranchId && !isTeacherAdded) {
                const school = await tx.school.findUnique({
                    where: { id: schoolId },
                    include: { branches: { take: 1, orderBy: { created_at: 'asc' } } }
                });
                resolvedBranchId = school?.branches[0]?.id;
                if (!resolvedBranchId) {
                    throw new Error('Branch is required to generate a student ID. Please assign a branch first.');
                }
            }

            if (schoolId && resolvedBranchId && !isTeacherAdded) {
                try {
                    schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, resolvedBranchId, 'student', tx);

                    if (!admissionNumber) {
                        admissionNumber = await IdGeneratorService.generateAdmissionNumber(schoolId, tx);
                    }

                    await tx.user.update({
                        where: { id: user.id },
                        data: { school_generated_id: schoolGeneratedId }
                    });
                } catch (idErr: any) {
                    console.warn('[StudentService] ID generation failed:', idErr.message);
                }
            }

            // 3. Create or Update Student Profile
            const student = await (tx.student.upsert as any)({
                where: { user_id: user.id },
                create: {
                    user_id: user.id,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    school_generated_id: schoolGeneratedId,
                    full_name: fullName,
                    email: studentEmail,
                    dob: dateOfBirth ? new Date(dateOfBirth) : null,
                    gender: gender,
                    address: enrollmentData.address || enrollmentData.studentAddress || null,
                    admission_number: admissionNumber || null,
                    grade: enrollmentData.grade ?? 1,
                    section: enrollmentData.section ?? 'A',
                    curriculum_type: curriculumType,
                    status: initialStatus,
                    avatar_url: incomingAvatar,
                    assigned_subjects: Array.isArray(enrollmentData.subjects)
                        ? enrollmentData.subjects.map((s: any) => (typeof s === 'string' ? s : (s?.name || s?.id))).filter(Boolean)
                        : [],
                    created_by: creatorId,
                    updated_at: new Date()
                },
                update: {
                    full_name: fullName,
                    email: studentEmail,
                    dob: dateOfBirth ? new Date(dateOfBirth) : null,
                    gender: gender,
                    address: enrollmentData.address || enrollmentData.studentAddress || null,
                    admission_number: admissionNumber || null,
                    grade: enrollmentData.grade ?? 1,
                    section: enrollmentData.section ?? 'A',
                    curriculum_type: curriculumType,
                    status: initialStatus,
                    // Only overwrite the photo when a new one was supplied.
                    ...(incomingAvatar ? { avatar_url: incomingAvatar } : {}),
                    created_by: creatorId,
                    updated_at: new Date()
                }
            });

            // 4. Handle Parent Linking
            let parentIdToLink = existingParentId;
            let parentCredentials = null;

            if (!parentIdToLink && parentEmail) {
                // Look up the parent within THIS school + branch (email is unique per
                // school+branch). Reuse the existing parent here, else create one.
                let parentUser = await tx.user.findFirst({
                    where: { email: parentEmail.toLowerCase(), school_id: schoolId, branch_id: branchId ?? null }
                });

                if (!parentUser) {
                    const parentPass = 'parent123';
                    const hashedParentPass = await bcrypt.hash(parentPass, 10);
                    
                    parentUser = await tx.user.create({
                        data: {
                            email: parentEmail.toLowerCase(),
                            password_hash: hashedParentPass,
                            full_name: parentName || 'Parent',
                            role: Role.PARENT,
                            school_id: schoolId,
                            branch_id: branchId || null,
                            email_verified: true,
                            initial_password: parentPass,
                            updated_at: new Date()
                        } as any
                    });

                    const parentProfile = await tx.parent.create({
                        data: {
                            user_id: parentUser.id,
                            full_name: parentName || 'Parent',
                            email: parentEmail.toLowerCase(),
                            phone: parentPhone,
                            address: parentAddress,
                            school_id: schoolId,
                            branch_id: branchId || null,
                            updated_at: new Date()
                        } as any
                    });
                    parentIdToLink = parentProfile.id;
                    
                    parentCredentials = {
                        userName: parentName || 'Parent',
                        email: parentEmail.toLowerCase(),
                        password: parentPass,
                        username: parentUser.email,
                        userType: 'Parent'
                    };
                } else {
                    const parentProfile = await tx.parent.findUnique({
                        where: { user_id: parentUser.id }
                    });
                    if (!parentProfile) {
                        const newParent = await tx.parent.create({
                            data: {
                                user_id: parentUser.id,
                                full_name: parentUser.full_name,
                                email: parentUser.email,
                                phone: parentPhone,
                                address: parentAddress,
                                school_id: schoolId,
                                branch_id: branchId || null,
                                updated_at: new Date()
                            } as any
                        });
                        parentIdToLink = newParent.id;
                    } else {
                        // Update existing parent info if provided
                        await tx.parent.update({
                            where: { id: parentProfile.id },
                            data: {
                                phone: parentPhone || parentProfile.phone,
                                address: parentAddress || parentProfile.address,
                                updated_at: new Date()
                            }
                        });
                        parentIdToLink = parentProfile.id;
                    }
                }
            }

            // Link Parent and Child if we have a parentId
            if (parentIdToLink) {
                await tx.parentChild.upsert({
                    where: {
                        parent_id_student_id: {
                            parent_id: parentIdToLink,
                            student_id: student.id
                        }
                    },
                    create: {
                        parent_id: parentIdToLink,
                        student_id: student.id,
                        school_id: schoolId,
                        branch_id: branchId || null
                    } as any,
                    update: {}
                });
            }

            // 5. Create Enrollments for Selected Classes
            let classIds = enrollmentData.selectedClassIds || (enrollmentData.class_id ? [enrollmentData.class_id] : []);
            
            // Handle Virtual/Shell Class IDs (Implicit Creation)
            if (classIds.length > 0) {
                const resolvedClassIds = [];
                for (const classId of classIds) {
                    if (typeof classId === 'string' && classId.startsWith('std-')) {
                        const parts = classId.split('-'); // std-grade-section
                        const gradeNum = parseInt(parts[1]);
                        const sectionStr = parts[2];

                        let cls = await tx.class.findFirst({
                            where: { school_id: schoolId, grade: gradeNum, section: sectionStr }
                        });

                        if (!cls) {
                            cls = await tx.class.create({
                                data: {
                                    school_id: schoolId,
                                    branch_id: branchId || null,
                                    grade: gradeNum,
                                    section: sectionStr,
                                    name: parts[1],
                                    level_category: gradeNum >= 7 ? 'Secondary' : (gradeNum >= 1 ? 'Primary' : 'Pre-Primary')
                                }
                            });
                        }
                        resolvedClassIds.push(cls.id);
                    } else {
                        resolvedClassIds.push(classId);
                    }
                }
                classIds = resolvedClassIds;
            }

            // Fallback: If no explicit class IDs, try to find a matching class by grade and section
            if (classIds.length === 0 && enrollmentData.grade !== undefined && enrollmentData.section) {
                const gradeNum = Number(enrollmentData.grade);
                const sectionStr = enrollmentData.section;

                let matchedClass = await tx.class.findFirst({
                    where: {
                        school_id: schoolId,
                        grade: gradeNum,
                        section: sectionStr,
                        ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
                    }
                });

                // If not found, create it implicitly
                if (!matchedClass) {
                    matchedClass = await tx.class.create({
                        data: {
                            school_id: schoolId,
                            branch_id: branchId || null,
                            grade: gradeNum,
                            section: sectionStr,
                            name: String(gradeNum),
                            level_category: gradeNum >= 7 ? 'Secondary' : (gradeNum >= 1 ? 'Primary' : 'Pre-Primary')
                        }
                    });
                }
                classIds = [matchedClass.id];
            }

            if (classIds.length > 0) {
                for (const classId of classIds) {
                    await tx.studentEnrollment.upsert({
                        where: {
                            student_id_class_id: {
                                student_id: student.id,
                                class_id: classId
                            }
                        },
                        create: {
                            student_id: student.id,
                            class_id: classId,
                            school_id: schoolId,
                            branch_id: branchId || null,
                            status: initialStatus,
                            is_primary: classId === classIds[0],
                            enrollment_date: new Date()
                        } as any,
                        update: {
                            status: initialStatus,
                            branch_id: branchId || null
                        }
                    });
                }
            }

            // 6. Save Documents (if any) — guarded: StudentDocument model may not exist in current Prisma client
            const txAny = tx as any;
            if (documentUrls && typeof documentUrls === 'object' && txAny.studentDocument?.create) {
                for (const [type, url] of Object.entries(documentUrls)) {
                    if (url) {
                        try {
                            await txAny.studentDocument.create({
                                data: {
                                    student_id: student.id,
                                    school_id: schoolId,
                                    name: `${type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}`,
                                    url: String(url),
                                    type: type,
                                    updated_at: new Date()
                                }
                            });
                        } catch (docErr: any) {
                            console.warn('[StudentService] Non-critical: could not save student document:', docErr.message);
                        }
                    }
                }
            } else if (documentUrls && typeof documentUrls === 'object' && Object.values(documentUrls).some(Boolean)) {
                // Fallback: persist passport photo to student.avatar_url so the upload is not lost
                const passport = (documentUrls as any).passportPhoto;
                if (passport) {
                    try {
                        await tx.student.update({
                            where: { id: student.id },
                            data: { avatar_url: String(passport) }
                        });
                    } catch (avErr: any) {
                        console.warn('[StudentService] Non-critical: could not persist passport photo:', avErr.message);
                    }
                }
            }

            const result = {
                studentId: student.id,
                schoolGeneratedId,
                email: studentEmail,
                password: isTeacherAdded ? null : generatedPassword,
                status: initialStatus,
                parentCredentials
            };

            // Emit real-time event
            SocketService.emitToSchool(schoolId, 'student:updated', { 
                action: 'enroll', 
                studentId: student.id 
            });

            // Notify Admins if student is Pending
            if (initialStatus === 'Pending') {
                const admins = await tx.user.findMany({
                    where: {
                        school_id: schoolId,
                        role: 'ADMIN' as any
                    },
                    select: { id: true }
                });

                for (const admin of admins) {
                    await tx.notification.create({
                        data: {
                            school_id: schoolId,
                            branch_id: branchId && branchId !== 'all' ? branchId : null,
                            user_id: admin.id,
                            title: 'New Student Approval Required',
                            message: `Teacher ${enrollmentData.teacherName || 'A teacher'} has enrolled a new student: ${student.full_name}. Action required for approval.`,
                            category: 'System',
                            audience: ['admin'],
                            updated_at: new Date()
                        } as any
                    });
                }
            }

            return result;
        });
    }

    static async approveStudent(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.$transaction(async (tx) => {
            const student = await tx.student.findFirst({
                where: { id: studentId, school_id: schoolId },
                include: { 
                    user: true,
                    enrollments: {
                        include: {
                            class: {
                                include: {
                                    teachers: {
                                        include: {
                                            teacher: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!student) throw new Error('Student not found');
            if (student.status === 'Active') throw new Error('Student is already active');

            const generatedPassword = crypto.randomBytes(8).toString('hex');
            const hashedPassword = await bcrypt.hash(generatedPassword, 10);

            // Resolve branch from student record when caller didn't provide one
            const effectiveBranchId = branchId || student.branch_id || undefined;
            let schoolGeneratedId = student.school_generated_id;
            if (!schoolGeneratedId && effectiveBranchId) {
                schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, effectiveBranchId, 'student', tx);
            }

            let admissionNumber = student.admission_number;
            if (!admissionNumber) {
                admissionNumber = await IdGeneratorService.generateAdmissionNumber(schoolId, tx);
            }

            await tx.user.update({
                where: { id: student.user_id },
                data: {
                    password_hash: hashedPassword,
                    school_generated_id: schoolGeneratedId,
                    email_verified: true,
                    initial_password: generatedPassword
                }
            });

            const updatedStudent = await tx.student.update({
                where: { id: student.id },
                data: {
                    status: 'Active',
                    school_generated_id: schoolGeneratedId,
                    admission_number: admissionNumber
                }
            });

            // Also update all enrollments for this student to Active
            await tx.studentEnrollment.updateMany({
                where: { student_id: student.id, school_id: schoolId },
                data: { status: 'Active' }
            });

            // Notify teachers who added this student
            const teacherIds = new Set<string>();
            for (const enrollment of (student as any).enrollments || []) {
                for (const classTeacher of enrollment.class.teachers || []) {
                    if (classTeacher.teacher?.user?.id) { 
                        teacherIds.add(classTeacher.teacher.user_id);
                    }
                }
            }

            // Create notifications for teachers
            for (const teacherUserId of teacherIds) {
                await tx.notification.create({
                    data: {
                        school_id: schoolId,
                        branch_id: branchId && branchId !== 'all' ? branchId : null,
                        user_id: teacherUserId,
                        title: 'Student Approved',
                        message: `Student "${student.full_name}" has been approved. Their login credentials have been sent to their registered contact.`,
                        category: 'System',
                        audience: ['teacher'],
                        updated_at: new Date()
                    } as any
                });
            }

            const result = {
                studentId: updatedStudent.id,
                schoolGeneratedId,
                email: student.email,
                password: generatedPassword,
                status: 'Active',
                notifiedTeachers: Array.from(teacherIds)
            };

            // Emit real-time event
            SocketService.emitToSchool(schoolId, 'student:updated', { 
                action: 'approve', 
                studentId: updatedStudent.id 
            });

            return result;
        });
    }

    static async getAllStudents(schoolId: string, branchId?: string, classId?: string, status: string = 'all') {
        const queryStatus = (status === 'all' || !status) ? undefined : status;
        
        const where: any = {
            school_id: schoolId,
            status: queryStatus,
            deleted_at: null,
        };

        // When fetching by classId the enrollment record already scopes to the right
        // students. Applying a branch_id filter on top breaks demo and cross-branch
        // scenarios where the class record's branch UUID differs from the caller's
        // active sandbox branch — resulting in 0 students even when the class has many.
        if (branchId && branchId !== 'all' && !classId) {
            where.branch_id = branchId;
        }

        if (classId) {
            // Primary: enrollment-based (works in production).
            // Fallback: grade+section match (covers demo/seed data where enrollment
            // rows may not exist). Look up the class to get grade, section, branch.
            const cls = await prisma.class.findFirst({
                where: { id: classId, school_id: schoolId },
                select: { grade: true, section: true, branch_id: true }
            });
            const enrollmentCond: any = {
                some: {
                    class_id: classId,
                    ...(queryStatus ? { status: queryStatus } : {})
                }
            };
            // When the class HAS an enrollment register, the register IS the
            // roster. Blending in the grade+section fallback on top used to pull
            // same-grade twin records that were never enrolled into the list, so
            // class screens showed duplicate students.
            const hasEnrollments = await prisma.studentEnrollment.count({
                where: { class_id: classId, deleted_at: null }
            }) > 0;
            if (hasEnrollments) {
                where.enrollments = enrollmentCond;
            } else if (cls?.grade != null) {
                // Fallback: match by grade (and section when the class has one) so
                // students without an explicit enrollment record are still visible.
                // school_id at the top of `where` already enforces tenant isolation.
                //
                // Virtual demo sandbox branches (demo-v-*) are per-session ephemeral IDs.
                // Classes and students created in different demo sessions end up with
                // different virtual branch_ids even though they belong to the same demo
                // school, so restricting by cls.branch_id would return 0 students.
                // For virtual branches we skip the branch constraint — school_id isolation
                // is sufficient in the demo context.
                const isVirtualBranch = cls.branch_id?.startsWith('demo-v-') ?? false;
                const branchFallback = (cls.branch_id && !isVirtualBranch)
                    ? { OR: [{ branch_id: cls.branch_id }, { branch_id: null }] }
                    : {};
                // Only add section constraint when the class itself has a section —
                // a null-section class should match all sections of that grade.
                const sectionFilter = cls.section ? { section: cls.section } : {};
                where.OR = [
                    { enrollments: enrollmentCond },
                    {
                        grade: cls.grade,
                        ...sectionFilter,
                        ...branchFallback,
                        ...(queryStatus ? { status: queryStatus } : {})
                    }
                ];
            } else {
                where.enrollments = enrollmentCond;
            }
        }

        return await prisma.student.findMany({
            where,
            include: {
                user: true
            },
            orderBy: { full_name: 'asc' }
        });
    }


    static async getStudentById(schoolId: string, branchId: string | undefined, id: string) {
        const student = await prisma.student.findFirst({
            where: {
                id: id,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                deleted_at: null
            },
            include: {
                user: true,
                academic_performance: true,
                behavior_notes: true,
                report_cards: true,
                enrollments: true, // Added to support edit mode
                parents: {
                    include: {
                        parent: true
                    }
                }
            }
        });

        if (student) {
            const primaryParent = student.parents?.[0]?.parent;
            return {
                ...student,
                parentName: primaryParent?.full_name,
                parentEmail: primaryParent?.email,
                parentPhone: primaryParent?.phone,
                parentAddress: primaryParent?.address,
                birthday: student.dob, // Defensive mapping for frontend
                dateOfBirth: student.dob
            };
        }
        return null;
    }

    static async updateStudent(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        return await prisma.$transaction(async (tx) => {
            // Support both primary ID and user_id for robustness
            const student = await tx.student.findFirst({
                where: {
                    OR: [
                        { id: id },
                        { user_id: id }
                    ],
                    school_id: schoolId
                }
            });

            if (!student) {
                throw new Error('Student record to update not found.');
            }

            const studentUpdates: any = {};
            // NOTE: only real Student scalar columns. 'school_bus_id' is NOT a field
            // on Student — including it made Prisma reject the whole update (it could
            // not match the input type and flagged branch_id as unknown).
            // branch_id and school_generated_id are intentionally excluded:
            // branch changes must go through BranchTransferService; ID changes are never allowed.
            const allowedFields = [
                'full_name', 'email', 'grade', 'section', 'department', 'gender',
                'dob', 'address', 'admission_number', 'curriculum_type', 'avatar_url',
                'status', 'attendance_status'
            ];

            // Explicitly pick only valid fields to avoid Prisma errors
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    if (field === 'dob') {
                        studentUpdates[field] = updates.dob ? new Date(updates.dob) : null;
                    } else if (field === 'grade') {
                        studentUpdates[field] = updates.grade !== null ? Number(updates.grade) : null;
                    } else {
                        studentUpdates[field] = updates[field];
                    }
                }
            }

            // Per-student subjects picked by the admin (accept `subjects` or
            // `assigned_subjects`; tolerate arrays of strings or {name}/{id} objects).
            const subjArr = updates.assigned_subjects ?? updates.subjects;
            if (Array.isArray(subjArr)) {
                studentUpdates.assigned_subjects = subjArr
                    .map((s: any) => (typeof s === 'string' ? s : (s?.name || s?.id)))
                    .filter(Boolean);
            }

            console.log('🛠️ [StudentService] Final update payload:', studentUpdates);

            const updatedStudent = await tx.student.update({
                where: { id: student.id },
                data: studentUpdates
            });

            // Sync back to User record for universal persistence
            if (updatedStudent.user_id) {
                const userUpdates: any = {};
                if (updates.full_name) userUpdates.full_name = updates.full_name;
                if (updates.email) userUpdates.email = updates.email;
                if (updates.avatar_url) userUpdates.avatar_url = updates.avatar_url;
                // school_generated_id is never updated via updateStudent

                if (Object.keys(userUpdates).length > 0) {
                    await tx.user.update({
                        where: { id: updatedStudent.user_id },
                        data: userUpdates
                    });
                }
            }

            SocketService.emitToSchool(schoolId, 'student:updated', { action: 'update', studentId: id });
            return updatedStudent;
        });
    }

    static async deleteStudent(schoolId: string, branchId: string | undefined, id: string) {
        const student = await prisma.student.findFirst({
            where: { id, school_id: schoolId, deleted_at: null },
            select: { id: true, user_id: true }
        });
        if (!student) {
            const err: any = new Error('Student not found');
            err.statusCode = 404;
            throw err;
        }
        const now = new Date();
        await prisma.$transaction([
            prisma.student.update({ where: { id: student.id }, data: { deleted_at: now } }),
            ...(student.user_id ? [prisma.user.update({ where: { id: student.user_id }, data: { deleted_at: now } })] : [])
        ]);
        SocketService.emitToSchool(schoolId, 'student:updated', { action: 'delete', studentId: id });
        return true;
    }

    static async removeStudentFromClass(schoolId: string, branchId: string | undefined, studentId: string, classId?: string) {
        return await prisma.studentEnrollment.deleteMany({
            where: {
                student_id: studentId,
                school_id: schoolId,
                ...(classId ? { class_id: classId } : {})
            }
        });
    }

    private static async syncStudentIdentity(schoolId: string, userId: string): Promise<void> {
        try {
            const student = await prisma.student.findFirst({
                where: { user_id: userId, school_id: schoolId },
                include: { user: true }
            });
            if (!student || !student.user) return;

            const mismatch =
                student.full_name !== student.user.full_name ||
                student.email !== student.user.email ||
                (student.school_generated_id && student.user.school_generated_id !== student.school_generated_id);

            if (mismatch) {
                await prisma.student.update({
                    where: { id: student.id },
                    data: {
                        full_name: student.user.full_name,
                        email: student.user.email,
                        school_generated_id: student.user.school_generated_id || student.school_generated_id
                    }
                });
                if (student.school_generated_id && !student.user.school_generated_id) {
                    await prisma.user.update({
                        where: { id: student.user_id },
                        data: { school_generated_id: student.school_generated_id }
                    });
                }
            }
        } catch (err: any) {
            console.warn('[StudentService] syncStudentIdentity failed silently:', err.message);
        }
    }

    static async getStudentProfileByUserId(schoolId: string, branchId: string | undefined, userId: string) {
        let student = await prisma.student.findFirst({
            where: { user_id: userId, school_id: schoolId },
            include: {
                user: true,
                parents: { include: { parent: true } }
            }
        });

        // Self-Healing: Only STUDENT role may trigger auto-creation of a Student record.
        // ADMIN/PROPRIETOR/SUPER_ADMIN calling /me should never get a ghost student record.
        if (!student) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user && user.role !== Role.STUDENT) {
                throw Object.assign(new Error('Forbidden'), { status: 403 });
            }
            const allowedRoles = [Role.STUDENT];
            if (user && allowedRoles.includes(user.role as any)) {
                console.log(`🛠️ [StudentService] Self-healing: Creating missing student record for user ${userId} (${user.role})`);
                
                // For demo/self-healing, we provide minimal defaults if missing
                student = await (prisma.student.create as any)({
                    data: {
                        user_id: userId,
                        school_id: user.school_id,
                        branch_id: user.branch_id || branchId || null,
                        full_name: user.full_name,
                        email: user.email,
                        status: 'Active',
                        grade: 1, // Default grade
                        section: 'A', // Default section
                        updated_at: new Date()
                    },
                    include: {
                        user: true,
                        parents: { include: { parent: true } }
                    }
                });

                // Also ensure a default enrollment exists so dashboard overview works
                if (student) {
                    const defaultClass = await prisma.class.findFirst({
                        where: { school_id: user.school_id }
                    });

                    if (defaultClass) {
                        await (prisma.studentEnrollment.create as any)({
                            data: {
                                student_id: student.id,
                                class_id: defaultClass.id,
                                school_id: user.school_id,
                                branch_id: user.branch_id || null,
                                status: 'Active',
                                is_primary: true,
                                enrollment_date: new Date()
                            }
                        });
                    }
                }
            }
        }

        if (student) {
            const primaryParent = student.parents?.[0]?.parent;
            return {
                ...student,
                parentName: primaryParent?.full_name,
                parentEmail: primaryParent?.email,
                parentPhone: primaryParent?.phone,
                parentAddress: primaryParent?.address,
                birthday: student.dob,
                dateOfBirth: student.dob
            };
        }

        return student;
    }

    static async getStudentDocuments(schoolId: string, studentId: string) {
        // The student_documents table is provisioned by a migration. If it has not
        // been applied yet, degrade gracefully (empty list) so the student profile
        // page still loads instead of crashing with a 500.
        if (!(prisma as any).studentDocument) return [];
        return await (prisma as any).studentDocument.findMany({
            where: { student_id: studentId, school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async addStudentDocument(schoolId: string, studentId: string, data: any) {
        if (!(prisma as any).studentDocument) {
            throw Object.assign(new Error('Document storage is not enabled yet. Please run the pending database update.'), { status: 503 });
        }
        return await (prisma as any).studentDocument.create({
            data: {
                student_id: studentId,
                school_id: schoolId,
                name: data.name,
                url: data.url,
                type: data.type,
                size: data.size != null ? String(data.size) : null
            }
        });
    }

    static async getStudentByStudentId(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.student.findFirst({
            where: {
                school_generated_id: studentId,
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            include: { user: true }
        });
    }

    static async bulkUpdateStatus(schoolId: string, branchId: string | undefined, ids: string[], status: string) {
        const result = await prisma.student.updateMany({
            where: { id: { in: ids }, school_id: schoolId },
            data: { status }
        });

        ids.forEach(id => SocketService.emitToSchool(schoolId, 'student:updated', { action: 'status_update', studentId: id }));
        return result;
    }

    static async getPerformance(schoolId: string, branchId: string | undefined, studentId: string, subject?: string | string[]) {
        return await prisma.academicPerformance.findMany({
            where: { 
                student_id: studentId, 
                school_id: schoolId,
                ...(subject ? {
                    subject: typeof subject === 'string' ? subject : { in: subject }
                } : {})
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async getBehaviorNotes(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.behaviorNote.findMany({
            where: { student_id: studentId, school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async getQuizResults(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.quizSubmission.findMany({
            where: { 
                student_id: studentId, 
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                quiz: {
                    select: {
                        title: true,
                        subject_id: true,
                        total_marks: true
                    }
                }
            },
            orderBy: { submitted_at: 'desc' }
        });
    }

    static async getStudentSubmissions(schoolId: string, branch_id: string | undefined, studentId: string) {
        return await prisma.assignmentSubmission.findMany({
            where: { 
                student_id: studentId,
                assignment: {
                    class: {
                        school_id: schoolId,
                        branch_id: branch_id && branch_id !== 'all' ? branch_id : undefined
                    }
                }
            },
            include: {
                assignment: true
            },
            orderBy: { submitted_at: 'desc' }
        });
    }

    static async getStudentFees(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.studentFee.findMany({
            where: { 
                student_id: studentId, 
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            orderBy: { due_date: 'asc' }
        });
    }

    static async getReportCards(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.reportCard.findMany({
            where: { 
                student_id: studentId, 
                school_id: schoolId,
                is_published: true
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async linkGuardian(schoolId: string, branchId: string | undefined, data: any) {
        const { studentId, parentId } = data;
        return await prisma.parentChild.upsert({
            where: {
                parent_id_student_id: {
                    parent_id: parentId,
                    student_id: studentId
                }
            },
            create: {
                parent_id: parentId,
                student_id: studentId,
                school_id: schoolId,
                branch_id: branchId || null
            } as any,
            update: {}
        });
    }

    static async unlinkGuardian(schoolId: string, branchId: string | undefined, data: any) {
        const { studentId, parentId } = data;
        return await prisma.parentChild.delete({
            where: {
                parent_id_student_id: {
                    parent_id: parentId,
                    student_id: studentId
                }
            }
        });
    }

    static async assignStudentToClass(schoolId: string, branchId: string | undefined, studentId: string, classId: string) {
        return await prisma.$transaction(async (tx) => {
            let targetClassId = classId;

            // Handle Virtual/Shell Class IDs
            if (targetClassId.startsWith('std-')) {
                const parts = targetClassId.split('-');
                const grade = parseInt(parts[1]);
                const section = parts[2];

                let cls = await tx.class.findFirst({
                    where: {
                        school_id: schoolId,
                        grade,
                        section,
                        ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
                    }
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
                targetClassId = cls.id;
            }

            const classData = await tx.class.findUnique({
                where: { id: targetClassId },
                select: { id: true, name: true }
            });

            if (!classData) throw new Error('Class not found');

            // Deactivate all currently-active enrollments before creating the new one
            await tx.studentEnrollment.updateMany({
                where: { student_id: studentId, school_id: schoolId, status: 'Active' },
                data: { status: 'Inactive' }
            });

            await tx.studentEnrollment.upsert({
                where: {
                    student_id_class_id: {
                        student_id: studentId,
                        class_id: classData.id
                    }
                },
                create: {
                    student_id: studentId,
                    class_id: classData.id,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    is_primary: true,
                    updated_at: new Date()
                } as any,
                update: {
                    is_primary: true
                }
            });

            // Send notifications
            const student = await tx.student.findUnique({
                where: { id: studentId },
                include: { user: true, parents: { include: { parent: true } } }
            });

            if (student) {
                await NotificationService.createNotification(schoolId, branchId, {
                    user_id: student.user.id,
                    title: 'Class Assignment',
                    message: `You have been assigned to ${classData.name}.`,
                    category: 'System',
                    audience: ['student']
                });

                for (const link of (student as any).parents || []) {
                    if (link.parent?.user_id) {
                        await NotificationService.createNotification(schoolId, branchId, {
                            user_id: link.parent.user_id,
                            title: 'Student Class Assignment',
                            message: `Your child ${student.full_name} has been assigned to ${classData.name}.`,
                            category: 'System',
                            audience: ['parent']
                        });
                    }
                }
            }

            return { success: true };
        });
    }

    static async getStudentStats(schoolId: string, studentId: string) {
        const [attendance, submissions, records, achievements] = await Promise.all([
            prisma.attendance.findMany({ where: { student_id: studentId, school_id: schoolId } }),
            prisma.assignmentSubmission.count({ where: { student_id: studentId, school_id: schoolId } }),
            prisma.academicPerformance.findMany({ where: { student_id: studentId, school_id: schoolId } }),
            prisma.achievement.count({ where: { student_id: studentId, school_id: schoolId } })
        ]);

        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        const averageScore = records.length > 0 
            ? Math.round(records.reduce((acc, r) => acc + r.score, 0) / records.length) 
            : 0;

        return {
            attendanceRate,
            assignmentsSubmitted: submissions,
            averageScore,
            studyHours: 0, // Not tracked in current schema, returning 0
            achievements: achievements
        };
    }

    static async getStudentAchievements(studentId: string) {
        return await prisma.achievement.findMany({
            where: { student_id: studentId },
            orderBy: { date: 'desc' }
        });
    }

    static async getDashboardOverview(schoolId: string, studentId: string, branchId?: string) {
        console.log(`🔍 [StudentService] Fetching dashboard overview for student: ${studentId}, school: ${schoolId}`);
        try {
            const today = new Date();
            // Normalize dayOfWeek: 0 is Sunday, but our timetable uses 1-7 (Mon-Sun)
            const rawDay = today.getDay();
            const dayOfWeek = rawDay === 0 ? 7 : rawDay;

            // 1. Get ALL student's enrolled classes
            console.log('   [1/5] Querying active enrollments...');
            const enrollments = await prisma.studentEnrollment.findMany({
                where: { student_id: studentId, status: 'Active' },
                include: { class: true }
            });

            if (enrollments.length === 0) {
                console.warn(`   ⚠️ No active enrollments found for student ${studentId}`);
                return { timetable: [], assignments: [], quizzes: [], stats: null };
            }

            const classIds = enrollments.map(e => e.class_id);
            const classNames = enrollments.map(e => e.class.name);
            console.log(`   ✅ Found ${enrollments.length} active classes: ${classNames.join(', ')}`);

            // Student's department (Science/Art/Commercial) — used to pick the right
            // subject for SSS periods that are split across departments.
            const studentRec = await prisma.student.findUnique({ where: { id: studentId }, select: { department: true } });
            const studentDept = studentRec?.department || null;

            console.log('   [2/5] Running dashboard queries parallelly (timetable, assignments, quizzes, stats, notifications)...');
            const [timetable, assignments, quizzes, stats, notifications] = await Promise.all([
                // Today's Timetable (from all sections student is in)
                prisma.timetable.findMany({
                    where: { 
                        school_id: schoolId,
                        day_of_week: dayOfWeek,
                        OR: [
                            { class_id: { in: classIds } },
                            { class_name: { in: classNames } }
                        ]
                    },
                    include: { 
                        teacher: { select: { full_name: true } }
                    },
                    orderBy: { start_time: 'asc' }
                }),
                // Pending Assignments
                prisma.assignment.findMany({
                    where: {
                        due_date: { gte: today },
                        is_published: true,
                        class_id: { in: classIds },
                        submissions: {
                            none: { student_id: studentId }
                        }
                    },
                    take: 20, // Increased to support "more assessment" count
                    orderBy: { due_date: 'asc' }
                }),
                // Upcoming Quizzes
                prisma.quiz.findMany({
                    where: {
                        is_published: true,
                        class_id: { in: classIds },
                        submissions: {
                            none: { student_id: studentId }
                        }
                    },
                    take: 10, // Increased to show more variety
                    orderBy: { created_at: 'desc' }
                }),
                // Stats
                this.getStudentStats(schoolId, studentId),
                // Recent system notifications
                (prisma as any).notification.findMany({
                    where: {
                        school_id: schoolId,
                        OR: [
                            { user_id: studentId }, // Specific to student
                            { audience: { has: 'student' } } // Generic student audience
                        ]
                    },
                    take: 5,
                    orderBy: { created_at: 'desc' }
                })
            ]);
            console.log('   ✅ All queries completed successfully');

            // Resolve department-split periods (SSS Science/Art/Commercial) to the
            // student's own department, drop duplicate rows, and sort by time. A student
            // with no department set still sees all options for that period.
            const DEPARTMENTS = ['Science', 'Art', 'Commercial'];
            const byPeriod: Record<string, any[]> = {};
            for (const t of (timetable as any[])) (byPeriod[t.start_time || ''] ||= []).push(t);
            const resolvedTimetable: any[] = [];
            const seenSlots = new Set<string>();
            for (const rows of Object.values(byPeriod)) {
                const deptRows = rows.filter((r: any) => DEPARTMENTS.includes(r.notes));
                const nonDept = rows.filter((r: any) => !DEPARTMENTS.includes(r.notes));
                // When the student has a known department, show only their subject.
                // When unknown, still pick one dept row (first) so the schedule shows
                // one subject per period rather than all three concatenated.
                const chosen = deptRows.length > 0
                    ? studentDept
                        ? [...deptRows.filter((r: any) => r.notes === studentDept), ...nonDept]
                        : [deptRows[0], ...nonDept]
                    : rows;
                for (const r of chosen) {
                    const k = `${r.class_id || r.class_name}|${r.start_time}|${r.subject}|${r.notes || ''}`;
                    if (seenSlots.has(k)) continue;
                    seenSlots.add(k);
                    resolvedTimetable.push(r);
                }
            }
            resolvedTimetable.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

            return {
                timetable: resolvedTimetable,
                assignments,
                quizzes,
                stats,
                notifications,
                classes: enrollments.map(e => e.class),
                primaryClass: enrollments.find(e => e.is_primary)?.class || enrollments[0].class
            };
        } catch (error: any) {
            console.error(`❌ [StudentService] Detailed error in getDashboardOverview for student ${studentId}:`, error);
            throw error;
        }
    }

    static async getMySubjects(schoolId: string, studentId: string) {
        // 0. PER-STUDENT ASSIGNMENT WINS. If the admin picked subjects for this
        // student on the Edit Student screen, that is the authoritative list shown
        // everywhere the student's subjects are read. Names map to the school's real
        // Subject records where possible; any extra names are returned as-is so the
        // admin's choice always shows.
        const studentRec = await prisma.student.findFirst({
            where: { id: studentId, school_id: schoolId },
            select: { assigned_subjects: true } as any
        }) as any;
        const assigned: string[] = (studentRec?.assigned_subjects || []).filter(Boolean);
        if (assigned.length > 0) {
            const records = await prisma.subject.findMany({
                where: { school_id: schoolId, name: { in: assigned } }
            });
            const byName = new Map(records.map(r => [r.name.toLowerCase(), r]));
            return assigned.map(name =>
                byName.get(name.toLowerCase()) || { id: name, name, school_id: schoolId }
            );
        }

        // 1. Get student's active enrollments with their classes and subjects
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { 
                student_id: studentId,
                school_id: schoolId,
                status: 'Active'
            },
            include: {
                class: {
                    include: {
                        subjects: true
                    }
                }
            }
        });

        const subjectMap = new Map<string, any>();
        
        // 2. Collect subjects from all enrolled classes
        enrollments.forEach(enrollment => {
            if (enrollment.class && enrollment.class.subjects) {
                enrollment.class.subjects.forEach(subject => {
                    subjectMap.set(subject.id, subject);
                });
            }
        });

        if (subjectMap.size > 0) {
            return Array.from(subjectMap.values());
        }

        // 3. Fallback: If no enrollments or subjects linked to classes, 
        // get student profile to check grade and return grade-level fallback
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { grade: true }
        });

        if (student) {
            const classesInGrade = await prisma.class.findMany({
                where: { 
                    school_id: schoolId,
                    grade: student.grade
                },
                include: { 
                    subjects: true
                }
            });

            classesInGrade.forEach(cls => {
                cls.subjects.forEach(subject => {
                    subjectMap.set(subject.id, subject);
                });
            });

            if (subjectMap.size > 0) {
                return Array.from(subjectMap.values());
            }
        }

        // 4. Final Fallback: Return all subjects for the school
        return await prisma.subject.findMany({
            where: { school_id: schoolId },
            orderBy: { name: 'asc' }
        });
    }

    static async getStudentSubjects(schoolId: string, studentId: string) {
        // This is essentially same as getMySubjects but for admin/teacher use on specific student
        return this.getMySubjects(schoolId, studentId);
    }


    static async getMyActivities(schoolId: string, studentId: string) {
        return await prisma.studentActivity.findMany({
            where: { student_id: studentId },
            include: {
                activity: {
                    include: {
                        events: true
                    }
                }
            }
        });
    }

    static async getMyQuizzes(schoolId: string, studentId: string) {
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { student_id: studentId, status: 'Active' }
        });

        if (!enrollment) return [];

        return await prisma.quiz.findMany({
            where: {
                school_id: schoolId,
                class_id: enrollment.class_id,
                is_published: true
            },
            include: {
                class: true
            }
        });
    }

    static async getMyAssignments(schoolId: string, studentId: string) {
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { student_id: studentId, status: 'Active' }
        });

        if (!enrollment) return [];

        return await prisma.assignment.findMany({
            where: {
                class_id: enrollment.class_id
            },
            include: {
                teacher: true
            }
        });
    }

    static async getStudentsByClass(schoolId: string, branchId: string | undefined, grade: number, section: string, curriculumId?: string) {
        const classRecord = await prisma.class.findFirst({
            where: {
                school_id: schoolId,
                // Allow classes in the specific branch OR global classes (branch_id: null)
                ...(branchId && branchId !== 'all' ? {
                    OR: [
                        { branch_id: branchId },
                        { branch_id: null }
                    ]
                } : {}),
                grade: grade,
                section: section
            }
        });

        if (!classRecord) {
            return [];
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                class_id: classRecord.id,
                status: 'Active'
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                avatar_url: true,
                                school_generated_id: true
                            }
                        },
                        academic_tracks: curriculumId ? {
                            where: { curriculum_id: curriculumId, status: 'Active' }
                        } : false
                    }
                }
            }
        });

        // If curriculumId is provided, filter out students who don't have an active track for it
        let filteredStudents = enrollments.map(e => e.student);
        if (curriculumId) {
            filteredStudents = filteredStudents.filter(s => s.academic_tracks && s.academic_tracks.length > 0);
        }
        return filteredStudents.map(s => ({
            id: s.id,
            name: s.full_name,
            first_name: s.full_name.split(' ')[0],
            last_name: s.full_name.split(' ').slice(1).join(' '),
            admission_number: s.school_generated_id || s.user?.school_generated_id || `S-${s.id.substring(0, 5)}`,
            school_generated_id: s.school_generated_id || s.user?.school_generated_id,
            avatar_url: s.avatar_url || s.user?.avatar_url,
            avatarUrl: s.avatar_url || s.user?.avatar_url,
            schoolId: s.school_generated_id || s.user?.school_generated_id || s.id // UUID as fallback
        }));
    }

    static async getStudentsBySubject(schoolId: string, subjectId: string) {
        // 1. Find the subject scoped to this school
        const subject = await (prisma.subject.findFirst as any)({
            where: { id: subjectId, school_id: schoolId },
            include: {
                classes: {
                    select: { id: true }
                }
            }
        });

        if (!subject) throw Object.assign(new Error('Subject not found'), { status: 404 });
        if (!subject.classes?.length) return [];

        const classIds = subject.classes.map((c: any) => c.id);

        // 2. Find all active students in those classes
        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                class_id: { in: classIds },
                status: 'Active'
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                avatar_url: true,
                                school_generated_id: true
                            }
                        }
                    }
                }
            }
        });

        // 3. De-duplicate students
        const studentMap = new Map<string, any>();
        enrollments.forEach(e => {
            const s = e.student;
            studentMap.set(s.id, {
                id: s.id,
                name: s.full_name,
                avatarUrl: s.avatar_url || (s as any).user?.avatar_url,
                schoolGeneratedId: s.school_generated_id || (s as any).user?.school_generated_id,
                section: s.section
            });
        });

        return Array.from(studentMap.values());
    }

    static async getPendingStudentsForSchool(schoolId: string, branchId: string | undefined) {
        return await prisma.student.findMany({
            where: {
                school_id: schoolId,
                // Strict branch isolation: only this branch (untagged → All Branches only).
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                status: 'Pending'
            },
            include: {
                user: true,
                creator: {
                    select: {
                        full_name: true,
                        role: true
                    }
                },
                enrollments: {
                    include: {
                        class: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async withdrawStudent(
        schoolId: string,
        studentId: string,
        reason: string,
        effectiveDate: string
    ): Promise<{ message: string; student: any }> {
        const student = await prisma.student.findFirst({
            where: { id: studentId, school_id: schoolId, deleted_at: null }
        });
        if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

        await prisma.studentEnrollment.updateMany({
            where: { student_id: studentId, school_id: schoolId, status: 'Active' },
            data: { status: 'Inactive' }
        });

        const updated = await prisma.student.update({
            where: { id: studentId },
            data: {
                status: 'Withdrawn',
                withdrawal_reason: reason,
                withdrawal_date: new Date(effectiveDate)
            }
        });

        SocketService.emitToSchool(schoolId, 'student:updated', { action: 'withdraw', studentId });
        return { message: 'Student withdrawn successfully', student: updated };
    }

    static async promoteStudent(
        schoolId: string,
        studentId: string,
        newGrade: number,
        newSection: string,
        branchId?: string,
        session?: string,
        term?: string
    ): Promise<{ student: any }> {
        const student = await prisma.student.findFirst({
            where: { id: studentId, school_id: schoolId, deleted_at: null }
        });
        if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });

        const effectiveBranchId = branchId || student.branch_id || undefined;

        await prisma.studentEnrollment.updateMany({
            where: { student_id: studentId, school_id: schoolId, status: 'Active' },
            data: { status: 'Inactive' }
        });

        let targetClass = await prisma.class.findFirst({
            where: {
                school_id: schoolId,
                grade: newGrade,
                section: newSection,
                ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {})
            }
        });

        if (!targetClass) {
            targetClass = await (prisma.class.create as any)({
                data: {
                    school_id: schoolId,
                    branch_id: effectiveBranchId || null,
                    grade: newGrade,
                    section: newSection,
                    name: `Grade ${newGrade} ${newSection}`,
                    level_category: newGrade >= 7 ? 'Secondary' : (newGrade >= 1 ? 'Primary' : 'Pre-Primary'),
                    updated_at: new Date()
                }
            });
        }

        await (prisma.studentEnrollment.create as any)({
            data: {
                student_id: studentId,
                class_id: targetClass!.id,
                school_id: schoolId,
                status: 'Active',
                session: session || '',
                term: term || '',
                updated_at: new Date()
            }
        });

        const updated = await prisma.student.update({
            where: { id: studentId },
            data: { grade: newGrade, section: newSection }
        });

        SocketService.emitToSchool(schoolId, 'student:updated', { action: 'promote', studentId });
        return { student: updated };
    }
}
