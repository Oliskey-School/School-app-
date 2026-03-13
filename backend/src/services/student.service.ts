import { supabase } from '../config/supabase';
import { NotificationService } from './notification.service';
import { IdGeneratorService } from './idGenerator.service';

export class StudentService {
    static async enrollStudent(schoolId: string, branchId: string | undefined, enrollmentData: any) {
        const {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            parentName,
            parentEmail,
            parentPhone,
            curriculumType,
            documentUrls
        } = enrollmentData;

        if (!firstName || !lastName) {
            throw new Error('First name and last name are required for enrollment.');
        }

        const fullName = `${firstName} ${lastName}`;
        const studentEmail = enrollmentData.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@student.school.com`;
        const generatedPassword = enrollmentData.password || 'student' + Math.floor(1000 + Math.random() * 9000);
        const generatedUsername = enrollmentData.username || (firstName.toLowerCase() + '.' + lastName.toLowerCase() + Math.floor(Math.random() * 100));

        // 1. Create Auth User using Admin Client (Service Role)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password: generatedPassword,
            user_metadata: {
                full_name: fullName,
                role: 'student',
                school_id: schoolId,
                username: generatedUsername
            },
            email_confirm: true
        });

        if (authError) {
            const msg = authError.message.toLowerCase();
            if (msg.includes('already registered') || msg.includes('email already in use')) {
                throw new Error('User already registered');
            }
            throw new Error(`Auth creation failed: ${authError.message}`);
        }
        const userId = authUser.user.id;
        const effectiveBranchId = branchId || enrollmentData.branch_id;

        // 2. Generate standard school ID before inserting records
        let schoolGeneratedId: string | undefined;
        if (effectiveBranchId) {
            try {
                schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, effectiveBranchId, 'student');
            } catch (idErr: any) {
                console.warn('[StudentService] Could not generate school ID:', idErr.message);
            }
        }

        // 3. Create User Profile (with unified school_generated_id)
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .insert([{
                id: userId,
                email: studentEmail,
                name: fullName,
                full_name: fullName,
                role: 'student',
                school_id: schoolId,
                branch_id: effectiveBranchId || null,
                school_generated_id: schoolGeneratedId || null,
                is_active: true
            }])
            .select()
            .single();

        if (profileError) throw new Error(`User profile creation failed: ${profileError.message}`);

        // 4. Create Student Record (with unified school_generated_id)
        const { data: student, error: studentError } = await supabase
            .from('students')
            .insert([{
                user_id: userId,
                school_id: schoolId,
                branch_id: effectiveBranchId,
                school_generated_id: schoolGeneratedId || null,
                name: fullName,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth,
                gender: gender,
                grade: enrollmentData.grade || 1,
                section: enrollmentData.section || 'A',
                class_id: enrollmentData.class_id,
                status: enrollmentData.status || 'Active',
                attendance_status: 'Present',
                admission_number: enrollmentData.admissionNumber,
                address: enrollmentData.address || enrollmentData.parentAddress,
                birth_certificate: documentUrls?.birthCertificate,
                previous_report: documentUrls?.previousReport,
                medical_records: documentUrls?.medicalRecords,
                passport_photo: documentUrls?.passportPhoto
            }])
            .select()
            .single();

        if (studentError) throw new Error(`Student record creation failed: ${studentError.message}`);

        // 4. Handle Academic Tracks
        const tracks = [];
        if (curriculumType === 'Nigerian' || curriculumType === 'Both') {
            const { data: nigerian } = await supabase.from('curricula').select('id').eq('name', 'Nigerian').single();
            if (nigerian) tracks.push({ student_id: student.id, curriculum_id: nigerian.id, status: 'Active', school_id: schoolId });
        }
        if (curriculumType === 'British' || curriculumType === 'Both') {
            const { data: british } = await supabase.from('curricula').select('id').eq('name', 'British').single();
            if (british) tracks.push({ student_id: student.id, curriculum_id: british.id, status: 'Active', school_id: schoolId });
        }
        if (tracks.length > 0) {
            await supabase.from('academic_tracks').insert(tracks);
        }

        // 5. Handle Parent (Simple creation for now)
        if (parentEmail) {
            // Check if parent user exists
            let { data: parentUser } = await supabase.from('users').select('id').eq('email', parentEmail).single();
            let parentId;

            if (!parentUser) {
                const parentPass = 'parent123';
                const { data: newParentAuth, error: pAuthErr } = await supabase.auth.admin.createUser({
                    email: parentEmail,
                    password: parentPass,
                    user_metadata: { full_name: parentName, role: 'parent', school_id: schoolId },
                    email_confirm: true
                });

                if (!pAuthErr) {
                    let parentGeneratedId: string | undefined;
                    if (effectiveBranchId) {
                        try {
                            parentGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, effectiveBranchId, 'parent');
                        } catch (idErr: any) {
                            console.warn('[StudentService] Could not generate parent ID:', idErr.message);
                        }
                    }

                    const { data: newParentProfile } = await supabase.from('users').insert([{
                        id: newParentAuth.user.id,
                        email: parentEmail,
                        name: parentName,
                        role: 'parent',
                        school_id: schoolId,
                        branch_id: effectiveBranchId || null,
                        school_generated_id: parentGeneratedId || null
                    }]).select().single();

                    const { data: newParent } = await supabase.from('parents').insert([{
                        user_id: newParentAuth.user.id,
                        name: parentName,
                        email: parentEmail,
                        phone: parentPhone,
                        school_id: schoolId,
                        branch_id: effectiveBranchId,
                        school_generated_id: parentGeneratedId || null
                    }]).select().single();

                    parentId = newParent?.id;
                }
            } else {
                const { data: existingParent } = await supabase.from('parents').select('id').eq('user_id', parentUser.id).single();
                parentId = existingParent?.id;
            }

            if (parentId) {
                await supabase.from('parent_children').insert([{
                    parent_id: parentId,
                    student_id: student.id,
                    school_id: schoolId,
                    branch_id: branchId
                }]);
            }
        }

        return {
            studentId: student.id,
            schoolGeneratedId: schoolGeneratedId || null,
            email: studentEmail,
            username: generatedUsername,
            password: generatedPassword
        };
    }

    static async getAllStudents(schoolId: string, branchId?: string, classId?: string) {
        let query = supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId);

        if (classId) {
            query = query.eq('class_id', classId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('name');

        if (error) throw new Error(error.message);

        if (error) throw new Error(error.message);

        return data;
    }


    static async getStudentById(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    }

    static async getStudentByStudentId(schoolId: string, branchId: string | undefined, studentId: string) {
        let query = supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId)
            .or(`school_generated_id.eq.${studentId},student_id.eq.${studentId}`);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    }

    static async updateStudent(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        let query = supabase
            .from('students')
            .update(updates)
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async bulkUpdateStatus(schoolId: string, branchId: string | undefined, ids: string[], status: string) {
        let query = supabase
            .from('students')
            .update({ status })
            .eq('school_id', schoolId)
            .in('id', ids);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.select();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteStudent(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('students')
            .delete()
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { error } = await query;

        if (error) throw new Error(error.message);
        return true;
    }

    static async getStudentProfileByUserId(schoolId: string, branchId: string | undefined, userId: string) {
        // Handle demo IDs (both old prefix and new UUID format)
        const demoMap: Record<string, string> = {
            '3d6f7a8b-9c0d-4e1f-8a9b-0c1d2e3f4a5b': 'student',
            '6f90901e-4119-457d-8d73-745b17831a30': 'teacher',
            '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6': 'admin'
        };

        if (userId.startsWith('demo-') || demoMap[userId]) {
            const role = demoMap[userId] || userId.replace('demo-', '').replace('-id', '');
            let query = supabase
                .from('students')
                .select(`
                    *,
                    academic_performance (*),
                    behavior_notes (*),
                    report_cards (*)
                `)
                .eq('school_id', schoolId)
                .ilike('email', `%${role}%`);

            if (branchId && branchId !== 'all') {
                query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
            }

            const { data, error } = await query.limit(1).maybeSingle();
            if (error) throw new Error(error.message);
            return data;
        }

        let query = supabase
            .from('students')
            .select(`
                *,
                academic_performance (*),
                behavior_notes (*),
                report_cards (*)
            `)
            .eq('user_id', userId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    }

    static async getPerformance(schoolId: string, branchId: string | undefined, studentId: string) {
        let query = supabase
            .from('academic_performance')
            .select('*')
            .eq('student_id', studentId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async getQuizResults(schoolId: string, branchId: string | undefined, studentId: string) {
        let query = supabase
            .from('quiz_submissions')
            .select('*, quizzes(title, subject)')
            .eq('student_id', studentId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('submitted_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async linkGuardian(schoolId: string, branchId: string | undefined, payload: any) {
        const { studentId, guardianName, guardianEmail, guardianPhone } = payload;

        if (!studentId || !guardianName || !guardianEmail) {
            throw new Error('Student ID, Guardian Name, and Guardian Email are required.');
        }

        // Use the top-level supabase client for trusted linking bypassing RLS
        const supabaseAdmin = supabase;

        let parentIdToLink: string | null = null;
        let generatedPassword = null;
        let generatedUsername = null;

        // 1. Check if user already exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id, name, email')
            .eq('email', guardianEmail)
            .maybeSingle();

        if (existingUser) {
            // Find parent profile
            const { data: existingParent } = await supabaseAdmin
                .from('parents')
                .select('id')
                .eq('user_id', existingUser.id)
                .maybeSingle();

            if (existingParent) {
                parentIdToLink = existingParent.id;
            } else {
                // User exists but no parent profile, create one
                const { data: newProfile, error: profileErr } = await supabaseAdmin
                    .from('parents')
                    .insert([{
                        user_id: existingUser.id,
                        name: guardianName,
                        email: guardianEmail,
                        phone: guardianPhone || null,
                        avatar_url: `https://i.pravatar.cc/150?u=${guardianName.replace(' ', '')}`,
                        school_id: schoolId,
                        branch_id: branchId
                    }])
                    .select()
                    .single();

                if (profileErr) throw new Error(`Failed to create parent profile: ${profileErr.message}`);
                parentIdToLink = newProfile.id;
            }
        } else {
            // 2. Create completely new User & Parent
            // Leverage the existing auth creation bypassing logic for accounts
            const bcrypt = require('bcryptjs');
            generatedPassword = 'parent' + Math.floor(1000 + Math.random() * 9000); // Simple default
            generatedUsername = guardianName.replace(/\s+/g, '.').toLowerCase() + Math.floor(Math.random() * 100);
            const hashedPassword = await bcrypt.hash(generatedPassword, 10);

            // Auth Admin Create
            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                email: guardianEmail,
                password: generatedPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: guardianName,
                    role: 'parent',
                    school_id: schoolId,
                    username: generatedUsername
                }
            });

            if (authErr) throw new Error(`Auth creation failed: ${authErr.message}`);

            // DB User Insert
            const { error: dbErr } = await supabaseAdmin.from('users').insert([{
                id: authData.user.id,
                email: guardianEmail,
                role: 'parent',
                school_id: schoolId,
                name: guardianName
            }]);

            if (dbErr) throw new Error(`User DB insert failed: ${dbErr.message}`);

            // Auth Accounts Sync
            await supabaseAdmin.from('auth_accounts').insert([{
                username: generatedUsername,
                email: guardianEmail,
                school_id: schoolId,
                is_verified: true,
                user_id: authData.user.id
            }]);

            // Create Parent
            const { data: newParent, error: pErr } = await supabaseAdmin
                .from('parents')
                .insert([{
                    user_id: authData.user.id,
                    name: guardianName,
                    email: guardianEmail,
                    phone: guardianPhone || null,
                    avatar_url: `https://i.pravatar.cc/150?u=${guardianName.replace(' ', '')}`,
                    school_id: schoolId,
                    branch_id: branchId
                }])
                .select()
                .single();

            if (pErr) throw new Error(`Parent creation failed: ${pErr.message}`);
            parentIdToLink = newParent.id;
        }

        // 3. Link student table
        if (parentIdToLink) {
            const { error: linkError } = await supabaseAdmin
                .from('students')
                .update({ parent_id: parentIdToLink })
                .eq('id', studentId);

            if (linkError) throw new Error(`Link student failed: ${linkError.message}`);

            // 4. Update junction table
            const { error: junctionError } = await supabaseAdmin
                .from('parent_children')
                .insert({
                    parent_id: parentIdToLink,
                    student_id: studentId,
                    school_id: schoolId,
                    branch_id: branchId
                });

            // Ignore 23505 constraints safely or table missing
            if (junctionError && junctionError.code !== '23505') {
                console.warn('Junction insert failed:', junctionError);
            }
        }

        return {
            success: true,
            message: existingUser ? 'Linked to existing guardian' : 'Created and linked new guardian',
            parentId: parentIdToLink,
            credentials: generatedPassword ? {
                username: generatedUsername,
                password: generatedPassword,
                email: guardianEmail,
                userType: 'Parent'
            } : null
        };
    }

    static async assignStudentToClass(schoolId: string, branchId: string | undefined, studentId: string, classId: string) {
        // 1. Get class name
        const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', classId)
            .single();

        const className = classData?.name || 'new class';

        // 2. Update student
        const { error: updateError } = await supabase
            .from('students')
            .update({ class_id: classId, current_class_id: classId })
            .eq('id', studentId)
            .eq('school_id', schoolId);

        if (updateError) throw new Error(updateError.message);

        // 3. Get student and parent info for notifications
        const { data: student } = await supabase
            .from('students')
            .select('*, profiles!inner(*)')
            .eq('id', studentId)
            .single();

        if (student) {
            const notifications = [];
            // To Student
            if (student.user_id) {
                notifications.push(NotificationService.createNotification(schoolId, branchId, {
                    user_id: student.user_id,
                    title: 'Class Assignment',
                    message: `You have been assigned to ${className}.`,
                    category: 'System',
                    audience: ['student']
                }));
            }

            // To Parents
            const { data: parentLinks } = await supabase
                .from('parent_children')
                .select('parents(user_id)')
                .eq('student_id', studentId);

            if (parentLinks) {
                for (const link of parentLinks) {
                    const parentUserId = (link.parents as any)?.user_id;
                    if (parentUserId) {
                        notifications.push(NotificationService.createNotification(schoolId, branchId, {
                            user_id: parentUserId,
                            title: 'Student Class Assignment',
                            message: `Your child ${student.profiles.full_name} has been assigned to ${className}.`,
                            category: 'System',
                            audience: ['parent']
                        }));
                    }
                }
            }
            await Promise.all(notifications);
        }

        return { success: true };
    }

    static async removeStudentFromClass(schoolId: string, branchId: string | undefined, studentId: string) {
        // 1. Get student and their current class name before removal
        const { data: student } = await supabase
            .from('students')
            .select('*, profiles!inner(*), classes(name)')
            .eq('id', studentId)
            .eq('school_id', schoolId)
            .single();

        if (!student) throw new Error('Student not found');

        const className = student.classes?.name || 'their class';

        // 2. Update student
        const { error: updateError } = await supabase
            .from('students')
            .update({ class_id: null, current_class_id: null })
            .eq('id', studentId)
            .eq('school_id', schoolId);

        if (updateError) throw new Error(updateError.message);

        // 3. Send notifications
        const notifications = [];
        // To Student
        if (student.user_id) {
            notifications.push(NotificationService.createNotification(schoolId, branchId, {
                user_id: student.user_id,
                title: 'Class Removal',
                message: `You have been removed from ${className}.`,
                category: 'System',
                audience: ['student']
            }));
        }

        // To Parents
        const { data: parentLinks } = await supabase
            .from('parent_children')
            .select('parents(user_id)')
            .eq('student_id', studentId);

        if (parentLinks) {
            for (const link of parentLinks) {
                const parentUserId = (link.parents as any)?.user_id;
                if (parentUserId) {
                    notifications.push(NotificationService.createNotification(schoolId, branchId, {
                        user_id: parentUserId,
                        title: 'Student Class Removal',
                        message: `Your child ${student.profiles.full_name} has been removed from ${className}.`,
                        category: 'System',
                        audience: ['parent']
                    }));
                }
            }
        }
        await Promise.all(notifications);

        return { success: true };
    }
}
