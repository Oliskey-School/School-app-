import prisma from '../config/database';
import { NotificationService } from './notification.service';
import { IdGeneratorService } from './idGenerator.service';
import bcrypt from 'bcryptjs';
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
            parentId: existingParentId,
            curriculumType
        } = enrollmentData;

        if (!firstName || !lastName) {
            throw new Error('First name and last name are required for enrollment.');
        }

        const roleString = (creatorRole || '').toUpperCase();
        const isTeacherAdded = roleString === 'TEACHER';
        const initialStatus = isTeacherAdded ? 'Pending' : (enrollmentData.status || 'Active');

        const fullName = `${firstName} ${lastName}`;
        const studentEmail = enrollmentData.email?.toLowerCase() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@student.school.com`;
        
        // Use a dummy password if pending, real one if active
        const generatedPassword = isTeacherAdded ? 'pending' : (enrollmentData.password || 'student' + Math.floor(1000 + Math.random() * 9000));
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        return await prisma.$transaction(async (tx) => {
            // 1. Create or Find User
            const user = await (tx.user.upsert as any)({
                where: { email: studentEmail },
                create: {
                    email: studentEmail,
                    password_hash: hashedPassword,
                    full_name: fullName,
                    role: Role.STUDENT,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    email_verified: !isTeacherAdded,
                    initial_password: isTeacherAdded ? null : generatedPassword,
                    updated_at: new Date()
                },
                update: {
                    full_name: fullName,
                    school_id: schoolId,
                    branch_id: branchId || null,
                    updated_at: new Date()
                }
            });

            // 2. Generate School ID (only if not pending)
            let schoolGeneratedId: string | null = null;
            if (schoolId && branchId && !isTeacherAdded) {
                try {
                    schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, branchId, 'student');
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
                    address: enrollmentData.address || null,
                    admission_number: enrollmentData.admission_number || enrollmentData.admissionNumber || null,
                    grade: enrollmentData.grade ?? 1,
                    section: enrollmentData.section ?? 'A',
                    curriculum_type: curriculumType,
                    status: initialStatus,
                    created_by: creatorId,
                    updated_at: new Date()
                },
                update: {
                    full_name: fullName,
                    email: studentEmail,
                    dob: dateOfBirth ? new Date(dateOfBirth) : null,
                    gender: gender,
                    address: enrollmentData.address || null,
                    admission_number: enrollmentData.admission_number || enrollmentData.admissionNumber || null,
                    grade: enrollmentData.grade ?? 1,
                    section: enrollmentData.section ?? 'A',
                    curriculum_type: curriculumType,
                    status: initialStatus,
                    created_by: creatorId,
                    updated_at: new Date()
                }
            });

            // 4. Handle Parent Linking
            let parentIdToLink = existingParentId;
            let parentCredentials = null;

            if (!parentIdToLink && parentEmail) {
                let parentUser = await tx.user.findUnique({
                    where: { email: parentEmail.toLowerCase() }
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
                                school_id: schoolId,
                                branch_id: branchId || null,
                                updated_at: new Date()
                            } as any
                        });
                        parentIdToLink = newParent.id;
                    } else {
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
            
            // Fallback: If no explicit class IDs, try to find a matching class by grade and section
            if (classIds.length === 0 && enrollmentData.grade !== undefined && enrollmentData.section) {
                const matchedClass = await tx.class.findFirst({
                    where: {
                        school_id: schoolId,
                        grade: Number(enrollmentData.grade),
                        section: enrollmentData.section,
                        ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
                    },
                    select: { id: true }
                });
                if (matchedClass) {
                    classIds = [matchedClass.id];
                }
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
                        role: 'ADMIN' as any,
                        is_active: true
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

            const generatedPassword = 'student' + Math.floor(1000 + Math.random() * 9000);
            const hashedPassword = await bcrypt.hash(generatedPassword, 10);

            let schoolGeneratedId = student.school_generated_id;
            if (!schoolGeneratedId && branchId) {
                schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, branchId, 'student');
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
                    school_generated_id: schoolGeneratedId
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
                        message: `Student "${student.full_name}" has been approved by admin. Login ID: ${schoolGeneratedId}, Password: ${generatedPassword}`,
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

    static async getAllStudents(schoolId: string, branchId?: string, classId?: string, status: string = 'Active') {
        const queryStatus = status === 'all' ? undefined : status;
        
        return await prisma.student.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                status: queryStatus || undefined,
                enrollments: classId ? { some: { class_id: classId, status: queryStatus || undefined } } : undefined
            },
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
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
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
            return {
                ...student,
                birthday: student.dob, // Defensive mapping for frontend
                dateOfBirth: student.dob
            };
        }
        return null;
    }

    static async updateStudent(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        return await prisma.$transaction(async (tx) => {
            const updatedStudent = await tx.student.update({
                where: { id: id },
                data: updates
            });

            // Sync back to User record for universal persistence
            if (updatedStudent.user_id) {
                await tx.user.update({
                    where: { id: updatedStudent.user_id },
                    data: {
                        full_name: updates.full_name,
                        email: updates.email,
                        avatar_url: updates.avatar_url,
                        school_generated_id: updates.school_generated_id
                    }
                });
            }

            SocketService.emitToSchool(schoolId, 'student:updated', { action: 'update', studentId: id });
            return updatedStudent;
        });
    }

    static async deleteStudent(schoolId: string, branchId: string | undefined, id: string) {
        const student = await prisma.student.findUnique({ where: { id } });
        if (student) {
            await prisma.user.delete({ where: { id: student.user_id } });
            SocketService.emitToSchool(schoolId, 'student:updated', { action: 'delete', studentId: id });
        }
        return true;
    }

    static async removeStudentFromClass(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.studentEnrollment.deleteMany({
            where: {
                student_id: studentId,
                school_id: schoolId
            }
        });
    }

    static async getStudentProfileByUserId(schoolId: string, branchId: string | undefined, userId: string) {
        let student = await prisma.student.findFirst({
            where: { user_id: userId, school_id: schoolId },
            include: { user: true }
        });

        // Identity Auto-Sync: Reconcile Student profile with primary User record
        if (student && student.user) {
            const userIdentityMismatch = 
                student.full_name !== student.user.full_name || 
                student.email !== student.user.email ||
                (student.school_generated_id && student.user.school_generated_id !== student.school_generated_id);
                
            if (userIdentityMismatch) {
                console.log(`🔄 [StudentService] Syncing student profile for ${userId} with User data...`);
                student = await prisma.student.update({
                    where: { id: student.id },
                    data: {
                        full_name: student.user.full_name,
                        email: student.user.email,
                        school_generated_id: student.user.school_generated_id || student.school_generated_id
                    },
                    include: { user: true }
                });

                // Sync back to User if missing ID but Student table has it
                if (student.school_generated_id && !student.user.school_generated_id) {
                    await prisma.user.update({
                        where: { id: student.user_id },
                        data: { school_generated_id: student.school_generated_id }
                    });
                }
            }
        }

        // Self-Healing: If user is a STUDENT/ADMIN but has no Student record, create one
        if (!student) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const allowedRoles = [Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN, Role.PROPRIETOR];
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
                        user: true
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

        return student;
    }

    static async getStudentByStudentId(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.student.findFirst({
            where: { school_generated_id: studentId, school_id: schoolId },
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
            const classData = await tx.class.findUnique({
                where: { id: classId },
                select: { name: true }
            });

            if (!classData) throw new Error('Class not found');

            await tx.studentEnrollment.upsert({
                where: {
                    student_id_class_id: {
                        student_id: studentId,
                        class_id: classId
                    }
                },
                create: {
                    student_id: studentId,
                    class_id: classId,
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
            prisma.attendance.findMany({ where: { student_id: studentId } }),
            prisma.assignmentSubmission.count({ where: { student_id: studentId } }),
            prisma.academicPerformance.findMany({ where: { student_id: studentId } }),
            prisma.achievement.count({ where: { student_id: studentId } })
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
            const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...

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
            console.log(`   ✅ Found ${enrollments.length} active classes: ${classIds.join(', ')}`);

            console.log('   [2/5] Running dashboard queries parallelly (timetable, assignments, quizzes, stats, notifications)...');
            const [timetable, assignments, quizzes, stats, notifications] = await Promise.all([
                // Today's Timetable (from all sections student is in)
                prisma.timetable.findMany({
                    where: { 
                        class_id: { in: classIds },
                        day_of_week: dayOfWeek,
                        school_id: schoolId
                    },
                    orderBy: { start_time: 'asc' }
                }),
                // Pending Assignments
                prisma.assignment.findMany({
                    where: {
                        class_id: { in: classIds },
                        due_date: { gte: today },
                        is_published: true,
                        submissions: {
                            none: { student_id: studentId }
                        }
                    },
                    take: 5,
                    orderBy: { due_date: 'asc' }
                }),
                // Upcoming Quizzes
                prisma.quiz.findMany({
                    where: {
                        OR: [
                            { class_id: { in: classIds } },
                            { class_id: null, school_id: schoolId } // School-wide quizzes
                        ],
                        is_published: true,
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
                prisma.notification.findMany({
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

            return {
                timetable,
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
        // 1. Try to find active enrollment
        let enrollment = await prisma.studentEnrollment.findFirst({
            where: { student_id: studentId, status: 'Active' },
            include: { 
                class: {
                    include: {
                        subjects: true
                    }
                }
            }
        });

        // 2. If no active enrollment, try ANY enrollment
        if (!enrollment) {
            enrollment = await prisma.studentEnrollment.findFirst({
                where: { student_id: studentId },
                include: { 
                    class: {
                        include: {
                            subjects: true
                        }
                    }
                }
            });
        }

        if (enrollment && enrollment.class.subjects.length > 0) {
            return enrollment.class.subjects;
        }

        // 3. Fallback: Lookup subjects by student's grade/section directly
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        });

        if (student) {
            const classRecord = await prisma.class.findFirst({
                where: { 
                    school_id: schoolId,
                    grade: student.grade,
                    section: student.section
                },
                include: { subjects: true }
            });

            if (classRecord && classRecord.subjects.length > 0) {
                return classRecord.subjects;
            }
        }

        return [];
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
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
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

    static async getPendingStudentsForSchool(schoolId: string, branchId: string | undefined) {
        return await prisma.student.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
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
}
