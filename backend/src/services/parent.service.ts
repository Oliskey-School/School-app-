import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { EmailService } from './email.service';
import { IdGeneratorService } from './idGenerator.service';
import { Role } from '../../generated/prisma-client';
import { SocketService } from './socket.service';

export class ParentService {
    static async getParents(schoolId: string, branchId?: string) {
        const parents = await (prisma.parent.findMany as any)({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                children: {
                    include: {
                        student: true
                    }
                }
            },
            orderBy: { full_name: 'asc' }
        });

        return (parents || []).map((p: any) => ({
            ...p,
            childIds: p.children?.map((pc: any) => pc.student_id) || [],
            childrenNames: p.children?.map((pc: any) => pc.student?.full_name).filter(Boolean) || []
        }));
    }

    static async linkChild(schoolId: string, branchId: string | undefined, parentId: string, studentIdOrCode: string) {
        // 1. Resolve Parent ID (could be Parent.id or User.id)
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [
                    { id: parentId },
                    { user_id: parentId }
                ],
                school_id: schoolId
            }
        });
        if (!parent) throw new Error('Parent profile not found');
        const resolvedParentId = parent.id;

        // 2. Resolve student ID if it's a school_generated_id
        let studentId = studentIdOrCode;
        if (!studentIdOrCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const student = await prisma.student.findFirst({
                where: {
                    school_id: schoolId,
                    school_generated_id: studentIdOrCode
                },
                select: { id: true }
            });
            if (!student) throw new Error(`Student with ID ${studentIdOrCode} not found`);
            studentId = student.id;
        }

        console.log('🛠️ [ParentService] Manually linking child to parent:', { resolvedParentId, studentId });
        
        try {
            // Manual check to avoid any weird upsert behavior
            const existing = await prisma.parentChild.findFirst({
                where: {
                    parent_id: resolvedParentId,
                    student_id: studentId
                }
            });

            if (existing) {
                console.log('✅ [ParentService] Relationship already exists, returning existing record.');
                return existing;
            }

            const result = await (prisma.parentChild.create as any)({
                data: {
                    parent_id: resolvedParentId,
                    student_id: studentId,
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null
                }
            });

            SocketService.emitToSchool(schoolId, 'parent:updated', { action: 'link_child', parentId: resolvedParentId, studentId });
            return result;
        } catch (err: any) {
            if (err.message?.includes('Unique constraint') || err.code === 'P2002') {
                console.log('✅ [ParentService] Caught Unique constraint, finding existing record...');
                const existing = await prisma.parentChild.findFirst({
                    where: {
                        parent_id: resolvedParentId,
                        student_id: studentId
                    }
                });
                if (existing) return existing;
            }
            throw err;
        }
    }

    static async unlinkChild(schoolId: string, branchId: string | undefined, parentId: string, studentIdOrCode: string) {
        // 1. Resolve Parent ID (could be Parent.id or User.id)
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [
                    { id: parentId },
                    { user_id: parentId }
                ],
                school_id: schoolId
            }
        });
        if (!parent) throw new Error('Parent profile not found');
        const resolvedParentId = parent.id;

        // 2. Resolve student ID if it's a school_generated_id
        let studentId = studentIdOrCode;
        if (!studentIdOrCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const student = await prisma.student.findFirst({
                where: {
                    school_id: schoolId,
                    school_generated_id: studentIdOrCode
                },
                select: { id: true }
            });
            if (student) studentId = student.id;
        }

        const result = await (prisma.parentChild.deleteMany as any)({
            where: {
                parent_id: resolvedParentId,
                student_id: studentId,
                school_id: schoolId
            }
        });

        SocketService.emitToSchool(schoolId, 'parent:updated', { action: 'unlink_child', parentId: resolvedParentId, studentId });
        return result;
    }

    static async getParentsByClassId(schoolId: string, branchId: string | undefined, classId: string) {
        const enrollments = await (prisma.studentEnrollment.findMany as any)({
            where: {
                class_id: classId,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                student: {
                    include: {
                        parents: {
                            include: {
                                parent: true
                            }
                        }
                    }
                }
            }
        });

        const parents: any[] = [];
        const seenParentIds = new Set();

        (enrollments || []).forEach((en: any) => {
            en.student?.parents?.forEach((p: any) => {
                if (p.parent && !seenParentIds.has(p.parent.id)) {
                    seenParentIds.add(p.parent.id);
                    parents.push(p.parent);
                }
            });
        });

        return parents;
    }

    static async createParent(schoolId: string, branchId: string | undefined, parentData: any, creatorId?: string) {
        const { email, full_name, phone, address, occupation, relationship, emergency_contact, sendCredentials = true } = parentData;
        
        if (!email || !full_name) {
            throw new Error('Email and full name are required');
        }

        const result = await prisma.$transaction(async (tx) => {
            let user = await tx.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            let generatedPassword: string | null = null;
            let loginId: string | null = null;

            if (!user) {
                generatedPassword = this.generateRandomPassword();
                const hashedPassword = await bcrypt.hash(generatedPassword, 10);

                let schoolGeneratedId: string | null = null;
                if (schoolId && branchId) {
                    try {
                        schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, branchId, 'parent');
                        loginId = schoolGeneratedId;
                    } catch (err) {
                        console.warn('[ParentService] ID generation failed:', err);
                    }
                }

                user = await (tx.user.create as any)({
                    data: {
                        email: email.toLowerCase(),
                        password_hash: hashedPassword,
                        full_name,
                        role: Role.PARENT,
                        school_id: schoolId,
                        branch_id: branchId && branchId !== 'all' ? branchId : null,
                        school_generated_id: schoolGeneratedId,
                        email_verified: true,
                        initial_password: generatedPassword,
                        updated_at: new Date()
                    }
                });

                loginId = schoolGeneratedId || email;
            } else {
                loginId = user.school_generated_id || user.email;
            }

            const parent = await (tx.parent.upsert as any)({
                where: { user_id: user.id },
                create: {
                    user_id: user.id,
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null,
                    full_name,
                    email: email.toLowerCase(),
                    phone,
                    address,
                    occupation,
                    relationship,
                    emergency_contact,
                    school_generated_id: user.school_generated_id,
                    created_by: creatorId,
                    updated_at: new Date()
                },
                update: {
                    full_name,
                    email: email.toLowerCase(),
                    phone,
                    address,
                    occupation,
                    relationship,
                    emergency_contact,
                    school_generated_id: user.school_generated_id,
                    updated_at: new Date()
                }
            });

            // 3. Link Children if provided
            const { childIds } = parentData;
            if (childIds && Array.isArray(childIds) && childIds.length > 0) {
                console.log(`🔗 [ParentService] Attempting to link ${childIds.length} students to parent ${parent.id}`);
                
                // Resolve student IDs (handles both UUIDs and school_generated_ids)
                const students = await tx.student.findMany({
                    where: {
                        school_id: schoolId,
                        OR: [
                            { id: { in: childIds } },
                            { school_generated_id: { in: childIds } }
                        ]
                    },
                    select: { id: true, full_name: true, school_generated_id: true }
                });

                if (students.length > 0) {
                    const relations = students.map(s => ({
                        parent_id: parent.id,
                        student_id: s.id,
                        school_id: schoolId,
                        branch_id: branchId && branchId !== 'all' ? branchId : null
                    }));

                    const linkedResult = await (tx.parentChild.createMany as any)({
                        data: relations,
                        skipDuplicates: true
                    });
                    
                    console.log(`✅ [ParentService] Successfully linked students. Count: ${linkedResult.count || 0}`);
                } else {
                    console.warn(`⚠️ [ParentService] No matching students found for IDs: ${childIds.join(', ')}`);
                }
            }

            await (tx.schoolMembership.upsert as any)({
                where: {
                    school_id_user_id: {
                        school_id: schoolId,
                        user_id: user.id
                    }
                },
                create: {
                    school_id: schoolId,
                    user_id: user.id,
                    base_role: Role.PARENT,
                    is_active: true,
                    updated_at: new Date()
                },
                update: {}
            });

            return {
                parent,
                userId: user.id,
                email: user.email,
                loginId: loginId || email,
                password: generatedPassword,
            };
        });

        // Send Email outside of transaction
        if (sendCredentials && result.password) {
            try {
                const school = await prisma.school.findUnique({
                    where: { id: schoolId },
                    select: { name: true }
                });
                
                await EmailService.sendCredentialsEmail(
                    email,
                    full_name,
                    'Parent',
                    result.loginId || email,
                    result.password,
                    school?.name
                );
            } catch (emailError) {
                console.error('[ParentService] Failed to send credentials email:', emailError);
            }
        }

        return {
            ...result,
            credentialsSent: sendCredentials && !!result.password
        };
    }

    private static generateRandomPassword(length: number = 8): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    static async getParentById(schoolId: string, branchId: string | undefined, id: string) {
        const parent = await (prisma.parent.findFirst as any)({
            where: {
                id: id,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                children: {
                    include: {
                        student: true
                    }
                }
            }
        });

        if (!parent) throw new Error('Parent not found');

        return {
            ...parent,
            childIds: parent.children?.map((pc: any) => pc.student_id) || []
        };
    }

    static async updateParent(schoolId: string, branchId: string | undefined, id: string, updates: any) {  
        const { childIds, branch_id, school_id, user_id, ...parentData } = updates;

        return await prisma.$transaction(async (tx) => {
            const data: any = { ...parentData };
            
            // Use relation for branch if branch_id is provided
            if (branch_id) {
                data.branch = { connect: { id: branch_id } };
            }

            // Support both primary ID and user_id for robustness
            const parent = await tx.parent.findFirst({
                where: {
                    OR: [
                        { id: id },
                        { user_id: id }
                    ],
                    school_id: schoolId
                }
            });

            if (!parent) {
                throw new Error('Parent record to update not found.');
            }

            const updatedParent = await (tx.parent.update as any)({
                where: { id: parent.id },
                data: data
            });

            if (parentData.school_generated_id !== undefined || parentData.full_name !== undefined) {
                const userData: any = {};
                if (parentData.school_generated_id !== undefined) userData.school_generated_id = parentData.school_generated_id;
                if (parentData.full_name !== undefined) userData.full_name = parentData.full_name;

                if (updatedParent.user_id) {
                    await tx.user.update({
                        where: { id: updatedParent.user_id },
                        data: {
                            full_name: parentData.full_name,
                            email: parentData.email,
                            avatar_url: parentData.avatar_url,
                            school_generated_id: parentData.school_generated_id
                        }
                    });
                }
            }

            // Handle children updates if provided
            if (childIds !== undefined && Array.isArray(childIds)) {
                // 1. Delete existing links
                await (tx.parentChild.deleteMany as any)({
                    where: { parent_id: id }
                });

                // 2. Create new links if not empty
                if (childIds.length > 0) {
                    const students = await tx.student.findMany({
                        where: {
                            school_id: schoolId,
                            OR: [
                                { id: { in: childIds } },
                                { school_generated_id: { in: childIds } }
                            ]
                        },
                        select: { id: true }
                    });

                    if (students.length > 0) {
                        const relations = students.map(s => ({
                            parent_id: id,
                            student_id: s.id,
                            school_id: schoolId,
                            branch_id: branchId && branchId !== 'all' ? branchId : null
                        }));

                        await (tx.parentChild.createMany as any)({
                            data: relations,
                            skipDuplicates: true
                        });
                    }
                }
            }

            SocketService.emitToSchool(schoolId, 'parent:updated', { action: 'update', parentId: id });
            return updatedParent;
        });
    }
    static async getParentProfile(schoolId: string, branchId: string | undefined, userId: string) {
        let parent = await (prisma.parent.findUnique as any)({
            where: { user_id: userId },
            include: { user: true }
        });
        
        // Identity Auto-Sync: Reconcile Parent records with User record
        if (parent && parent.user) {
            const schoolMismatch = parent.school_id !== schoolId;
            const userIdentityMismatch = 
                parent.full_name !== parent.user.full_name || 
                parent.email !== parent.user.email ||
                (parent.school_generated_id && parent.user.school_generated_id !== parent.school_generated_id);
                
            if (userIdentityMismatch || schoolMismatch) {
                console.log(`🔄 [ParentService] Syncing parent profile for ${userId} with User data (Mismatch or School migration)...`);
                
                // Sync Parent record to User data
                parent = await prisma.parent.update({
                    where: { id: parent.id },
                    data: {
                        full_name: parent.user.full_name,
                        email: parent.user.email,
                        school_id: schoolId,
                        school_generated_id: parent.user.school_generated_id || parent.school_generated_id
                    },
                    include: { user: true }
                });

                // Correct User table if it's missing the ID but Parent table has it
                if (parent.school_generated_id && !parent.user.school_generated_id) {
                    await prisma.user.update({
                        where: { id: parent.user_id },
                        data: { school_generated_id: parent.school_generated_id }
                    });
                }
            }
        }

        // Self-Healing: If user is a PARENT/ADMIN/TEACHER/PROPRIETOR but has no Parent record, create one
        if (!parent) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const allowedRoles = [Role.PARENT, Role.ADMIN, Role.SUPER_ADMIN, Role.PROPRIETOR, Role.TEACHER];
            if (user && allowedRoles.includes(user.role as any)) {
                console.log(`🛠️ [ParentService] Self-healing: Creating missing parent record for user ${userId} (${user.role})`);
                parent = await (prisma.parent.create as any)({
                    data: {
                        user_id: userId,
                        school_id: user.school_id,
                        branch_id: user.branch_id,
                        full_name: user.full_name,
                        email: user.email,
                        updated_at: new Date()
                    },
                    include: {
                        user: true
                    }
                });
            }
        }

        return parent;
    }

    static async deleteParent(schoolId: string, branchId: string | undefined, id: string) {
        await (prisma.parent.delete as any)({
            where: { id: id }
        });
        
        SocketService.emitToSchool(schoolId, 'parent:updated', { action: 'delete', parentId: id });
        return true;
    }

    static async getChildren(schoolId: string, branchId: string | undefined, parentUserId: string) {
        // Resolve parent by either user_id or id for robustness
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [
                    { user_id: parentUserId },
                    { id: parentUserId }
                ],
                school_id: schoolId
            }
        });

        if (!parent) return [];

        const relations = await (prisma.parentChild.findMany as any)({
            where: {
                parent_id: parent.id,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                student: {
                    include: {
                        academic_performance: true,
                        behavior_notes: true,
                        report_cards: true
                    }
                }
            }
        });

        return (relations || []).map((r: any) => r.student);
    }

    static async createAppointment(schoolId: string, branchId: string | undefined, appointmentData: any) {
        console.log('[ParentService] createAppointment received:', JSON.stringify(appointmentData));
        const { 
            requested_by_parent_id, 
            teacher_id, 
            student_user_id, 
            reason, 
            starts_at, 
            ends_at,
            title,
            description,
            parent_id,
            student_id,
            date
        } = appointmentData;

        // Resolve date from starts_at (frontend) or date (backup)
        const rawDate = starts_at || date;
        const appointmentDate = new Date(rawDate);
        
        console.log('[ParentService] Resolved date:', { 
            rawDate, 
            appointmentDate: appointmentDate.toISOString(), 
            isValid: !isNaN(appointmentDate.getTime()) 
        });

        // Final fallback if date is still invalid
        if (isNaN(appointmentDate.getTime())) {
             console.error('[ParentService] Invalid date for appointment:', { starts_at, date });
             throw new Error('Invalid appointment date. Please provide a valid date.');
        }

        const dataToCreate = {
            school_id: schoolId,
            branch_id: branchId && branchId !== 'all' ? branchId : null,
            parent_id: parent_id || requested_by_parent_id,
            teacher_id: teacher_id,
            student_id: student_id || student_user_id,
            title: title || `Appointment regarding Student`,
            description: description || reason || 'No details provided',
            date: appointmentDate,
            status: 'Pending'
        };
        
        console.log('[ParentService] Prisma data payload:', JSON.stringify(dataToCreate));

        return await (prisma.appointment.create as any)({
            data: dataToCreate
        });
    }

    static async volunteerSignup(schoolId: string, branchId: string | undefined, signupData: any) {
        return await prisma.$transaction(async (tx) => {
            const signup = await (tx.volunteerSignup.create as any)({
                data: {
                    ...signupData,
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null
                }
            });

            if (signupData.opportunity_id) {
                await (tx.volunteeringOpportunity.update as any)({
                    where: { id: signupData.opportunity_id },
                    data: {
                        slots_filled: { increment: 1 }
                    }
                });
            }

            SocketService.emitToSchool(schoolId, 'parent:updated', { action: 'volunteer_signup', signupId: signup.id });
            return signup;
        });
    }

    static async markNotificationRead(schoolId: string, branch_id: string | undefined, notificationId: string) {
        return await prisma.notification.update({
            where: { id: notificationId },
            data: { is_read: true }
        });
    }

    static async getResources(schoolId: string) {
        return await (prisma as any).resource.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async getVolunteeringOpportunities(schoolId: string, branchId: string | undefined) {
        return await prisma.volunteeringOpportunity.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            include: {
                _count: {
                    select: { signups: true }
                }
            },
            orderBy: { date: 'asc' }
        });
    }

    static async signupForOpportunity(schoolId: string, opportunityId: string, parentId: string) {
        const signup = await (prisma.volunteerSignup.create as any)({
            data: {
                school_id: schoolId,
                opportunity_id: opportunityId,
                parent_id: parentId,
                status: 'PENDING'
            }
        });

        SocketService.emitToSchool(schoolId, 'parent:updated', { action: 'opportunity_signup', opportunityId });
        return signup;
    }

    static async getVolunteeringStats(parentId: string) {
        const signupsCount = await (prisma.volunteerSignup.count as any)({
            where: { parent_id: parentId, status: 'APPROVED' }
        });

        return { totalHours: signupsCount * 2, badges: [] };
    }

    static async getChildOverview(schoolId: string, branchId: string | undefined, studentId: string) {
        console.log(`🔍 [ParentService] Fetching child overview for student: ${studentId}, school: ${schoolId}`);
        try {
            // 1. Get Student basic info
            console.log('   [1/5] Querying student basic info...');
            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: {
                    id: true,
                    full_name: true,
                    grade: true,
                    section: true,
                    school_id: true,
                    branch_id: true,
                    school: { select: { name: true } }
                }
            });

            if (!student) {
                console.warn(`   ⚠️ Student ${studentId} not found`);
                throw new Error('Student not found');
            }
            console.log(`   ✅ Found student: ${student.full_name}`);

            // 2. Get latest Attendance
            console.log('   [2/5] Querying latest attendance...');
            const attendance = await prisma.attendance.findFirst({
                where: { student_id: studentId },
                orderBy: { date: 'desc' },
                select: { status: true, date: true }
            });
            console.log(`   ✅ Attendance status: ${attendance?.status || 'No record'}`);

            // 3. Get Assignments due
            console.log('   [3/5] Querying assignments due...');
            let enrollment = await prisma.studentEnrollment.findFirst({
                where: { student_id: studentId, status: 'Active' },
                select: { class_id: true }
            });

            if (!enrollment) {
                enrollment = await prisma.studentEnrollment.findFirst({
                    where: { student_id: studentId },
                    select: { class_id: true }
                });
            }

            let classId = enrollment?.class_id;

            if (!classId) {
                const fallbackClass = await prisma.class.findFirst({
                    where: {
                        school_id: schoolId,
                        grade: student.grade,
                        section: student.section
                    },
                    select: { id: true }
                });
                classId = fallbackClass?.id;
            }

            let assignmentsDueCount = 0;
            if (classId) {
                const submissions = await prisma.assignmentSubmission.findMany({
                    where: { student_id: studentId },
                    select: { assignment_id: true }
                });
                const submittedIds = submissions.map(s => s.assignment_id);

                assignmentsDueCount = await prisma.assignment.count({
                    where: {
                        class_id: classId,
                        due_date: { gte: new Date() },
                        id: { notIn: submittedIds }
                    }
                });
            }
            console.log(`   ✅ Assignments due: ${assignmentsDueCount}`);

            // 4. Get Fee Balance
            console.log('   [4/5] Querying fee balance...');
            const fees = await prisma.studentFee.findMany({
                where: { student_id: studentId, status: { not: 'Paid' } },
                select: { amount: true, paid_amount: true }
            });
            const feeBalance = fees.reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);
            console.log(`   ✅ Fee balance: ${feeBalance}`);

            // 5. Get Latest Result
            console.log('   [5/5] Querying latest performance...');
            const latestPerformance = await prisma.academicPerformance.findFirst({
                where: { student_id: studentId },
                orderBy: { created_at: 'desc' }
            });
            console.log(`   ✅ Latest subject: ${latestPerformance?.subject || 'None'}`);

            return {
                id: student.id,
                name: student.full_name,
                grade: `${student.grade}${student.section || ''}`,
                school_name: student.school.name,
                attendance: {
                    status: attendance?.status || 'No record',
                    date: attendance?.date
                },
                assignments_due: assignmentsDueCount,
                fee_balance: feeBalance,
                latest_result: latestPerformance ? {
                    subject: latestPerformance.subject,
                    score: latestPerformance.score,
                    trend: latestPerformance.score >= 70 ? 'up' : 'down'
                } : undefined
            };
        } catch (error: any) {
            console.error(`❌ [ParentService] Detailed error in getChildOverview for ${studentId}:`, error);
            throw error;
        }
    }

    static async getStudentFees(schoolId: string, branchId: string | undefined, studentId: string) {
        return await prisma.studentFee.findMany({
            where: {
                student_id: studentId,
                school_id: schoolId
            },
            orderBy: { due_date: 'asc' }
        });
    }

    static async recordPayment(schoolId: string, branchId: string | undefined, paymentData: any) {
        const { fee_id, student_id, amount, reference, payment_method, purpose } = paymentData;

        return await prisma.$transaction(async (tx) => {
            // 1. Create Payment record
            const payment = await tx.payment.create({
                data: {
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null,
                    student_id,
                    fee_id,
                    amount,
                    reference,
                    payment_method,
                    purpose: purpose || 'fee_payment',
                    status: 'Completed',
                    payment_date: new Date()
                }
            });

            // 2. Update StudentFee if applicable
            if (fee_id) {
                const fee = await tx.studentFee.findUnique({
                    where: { id: fee_id }
                });

                if (fee) {
                    const newPaidAmount = (fee.paid_amount || 0) + amount;
                    const newStatus = newPaidAmount >= fee.amount ? 'Paid' : 'Partial';

                    await tx.studentFee.update({
                        where: { id: fee_id },
                        data: {
                            paid_amount: newPaidAmount,
                            status: newStatus,
                            updated_at: new Date()
                        }
                    });
                }
            }

            SocketService.emitToSchool(schoolId, 'finance:updated', { action: 'record_payment', paymentId: payment.id, studentId: student_id });
            return payment;
        });
    }

    // ==========================================
    // SUPPLEMENTARY FEATURES (Phase 2)
    // ==========================================

    static async getPTAMeetings(schoolId: string, branchId: string | undefined) {
        return await prisma.pTAMeeting.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                is_past: false
            },
            orderBy: { date: 'asc' }
        });
    }

    static async getLearningResources(schoolId: string, branchId: string | undefined) {
        return await prisma.resource.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async getParentMessages(schoolId: string, parentUserId: string) {
        return await prisma.message.findMany({
            where: {
                school_id: schoolId,
                OR: [
                    { sender_id: parentUserId },
                    { receiver_id: parentUserId }
                ]
            },
            include: {
                sender: { select: { id: true, full_name: true, role: true, avatar_url: true } },
                receiver: { select: { id: true, full_name: true, role: true, avatar_url: true } }
            },
            orderBy: { created_at: 'asc' }
        });
    }

    static async getNotifications(schoolId: string, branchId: string | undefined, userId: string) {
        return await prisma.notification.findMany({
            where: {
                school_id: schoolId,
                OR: [
                    { user_id: userId },
                    { audience: { hasSome: ['parent', 'all'] } }
                ],
                ...(branchId && branchId !== 'all' ? { OR: [{ branch_id: branchId }, { branch_id: null }] } : {})
            },
            orderBy: { created_at: 'desc' }
        });
    }


    static async sendMessage(schoolId: string, branchId: string | undefined, senderId: string, receiverId: string, content: string) {
        return await prisma.message.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                sender_id: senderId,
                receiver_id: receiverId,
                content
            },
            include: {
                sender: { select: { id: true, full_name: true, role: true, avatar_url: true } },
                receiver: { select: { id: true, full_name: true, role: true, avatar_url: true } }
            }
        });
    }

    // ==========================================
    // FEEDBACK & COMPLAINTS
    // ==========================================

    static async getComplaints(schoolId: string, parentId: string) {
        // Resolve parent ID first
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [{ id: parentId }, { user_id: parentId }],
                school_id: schoolId
            }
        });
        if (!parent) return [];

        const complaints = await prisma.complaint.findMany({
            where: {
                school_id: schoolId,
                parent_id: parent.id
            },
            orderBy: { created_at: 'desc' }
        });

        return complaints.map(c => ({
            id: c.id,
            category: c.category,
            rating: c.rating,
            comment: c.comment,
            imageUrl: c.image_url,
            status: c.status,
            timeline: c.timeline || [],
            createdAt: c.created_at,
            updatedAt: c.updated_at
        }));
    }

    static async createComplaint(schoolId: string, parentId: string, data: any) {
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [{ id: parentId }, { user_id: parentId }],
                school_id: schoolId
            }
        });
        if (!parent) throw new Error('Parent not found');

        const { category, rating, comment, imageUrl } = data;

        const timeline = [
            {
                timestamp: new Date().toISOString(),
                status: 'Submitted',
                comment: 'Complaint submitted successfully.',
                by: 'You'
            }
        ];

        const result = await prisma.complaint.create({
            data: {
                school_id: schoolId,
                parent_id: parent.id,
                category,
                rating: rating || 0,
                comment,
                image_url: imageUrl,
                status: 'Submitted',
                timeline: timeline as any
            }
        });

        return {
            id: result.id,
            category: result.category,
            rating: result.rating,
            comment: result.comment,
            imageUrl: result.image_url,
            status: result.status,
            timeline: result.timeline || [],
            createdAt: result.created_at
        };
    }

    // ==========================================
    // APPOINTMENTS & AVAILABILITY
    // ==========================================

    static async getTeacherAvailability(schoolId: string, teacherId: string, date: Date) {
        // Find availability slots for the specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const availabilities = await prisma.teacherAvailability.findMany({
            where: {
                school_id: schoolId,
                teacher_id: teacherId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // Also check for already booked appointments
        const bookedAppointments = await (prisma as any).appointment.findMany({
            where: {
                school_id: schoolId,
                teacher_id: teacherId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: { in: ['Scheduled', 'Confirmed', 'Pending'] }
            }
        });

        const bookedTimes = bookedAppointments.map((a: any) => {
            const d = new Date(a.date);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        });

        // If no explicit availabilities are set, we might want to return default slots
        // But for persistence, we should probably follow the database
        if (availabilities.length === 0) {
            // Return some default slots for the demo if none exist, or empty array
            // Let's return default slots for now to make it useful
            const defaultSlots = [
                '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
                '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM',
                '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'
            ];
            return defaultSlots.map(time => ({
                time,
                isBooked: bookedTimes.includes(time)
            }));
        }

        return availabilities.map(a => ({
            id: a.id,
            time: `${a.time_start}`, // Assuming time_start is already in format like '09:00 AM'
            isAvailable: a.is_available,
            isBooked: bookedTimes.includes(a.time_start)
        }));
    }

    // ==========================================
    // DASHBOARD AGGREGATION
    // ==========================================

    static async getParentTodayUpdate(schoolId: string, parentId: string, studentId?: string) {
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [{ id: parentId }, { user_id: parentId }],
                school_id: schoolId
            },
            include: {
                children: {
                    include: {
                        student: {
                            include: {
                                attendance: {
                                    where: { date: new Date() },
                                    take: 1
                                },
                                fees: {
                                    where: { status: { not: 'Paid' } }
                                },
                                enrollments: {
                                    where: { status: 'Active' },
                                    include: { class: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!parent) throw new Error('Parent not found');

        const childrenSummaries = parent.children.map(pc => {
            const s = pc.student;
            const activeEnrollment = s.enrollments[0];
            const attendance = s.attendance[0];
            
            // Calculate pending homework (simplified check: any assignment due in the next 3 days not submitted)
            // This is a bit complex for a single query, but we'll approximate
            
            const totalUnpaidFee = s.fees.reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);

            return {
                id: s.id,
                name: s.full_name,
                class_name: activeEnrollment?.class?.name || 'Unassigned',
                avatar_url: s.avatar_url || '',
                attendance_status: (attendance?.status?.toLowerCase() || 'not_marked') as any,
                homework_pending: 0, // Will be updated below
                fee_due: totalUnpaidFee,
                bus_status: 'On Route', // Mock for now until Bus integration is improved
                behavior_points: 0,
                upcoming_events: 0
            };
        });

        // Fetch feed items
        const feedItems: any[] = [];
        
        // 1. Attendance alerts
        parent.children.forEach(pc => {
            const s = pc.student;
            if (s.attendance[0]) {
                feedItems.push({
                    id: `att-${s.id}`,
                    type: 'attendance',
                    child_name: s.full_name.split(' ')[0],
                    description: `Marked ${s.attendance[0].status} for today.`,
                    time: 'Today',
                    icon_color: s.attendance[0].status === 'Present' ? 'text-emerald-600' : 'text-red-600'
                });
            }
        });

        // 2. Fee alerts
        parent.children.forEach(pc => {
            const s = pc.student;
            const overdueFees = s.fees.filter(f => f.status === 'Overdue');
            if (overdueFees.length > 0) {
                feedItems.push({
                    id: `fee-${s.id}`,
                    type: 'fee',
                    child_name: s.full_name.split(' ')[0],
                    description: `Has ${overdueFees.length} overdue fee(s).`,
                    time: 'Urgent',
                    icon_color: 'text-amber-600'
                });
            }
        });

        // 3. Recent Messages (last 5)
        const messages = await prisma.message.findMany({
            where: {
                school_id: schoolId,
                receiver_id: parent.user_id
            },
            take: 3,
            orderBy: { created_at: 'desc' },
            include: { sender: true }
        });

        messages.forEach(m => {
            feedItems.push({
                id: `msg-${m.id}`,
                type: 'message',
                child_name: 'School',
                description: `New message from ${m.sender.full_name}: "${m.content.substring(0, 30)}..."`,
                time: m.created_at.toISOString(),
                icon_color: 'text-indigo-600'
            });
        });

        return {
            children: childrenSummaries,
            feedItems: feedItems.sort((a, b) => b.time === 'Today' || b.time === 'Urgent' ? 1 : -1)
        };
    }
}
