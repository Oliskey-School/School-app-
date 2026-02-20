import { supabase } from '../config/supabase';

export class StudentService {
    static async enrollStudent(schoolId: string, enrollmentData: any) {
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
        const studentEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@student.school.com`;

        // 1. Create Auth User using Admin Client (Service Role)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password: 'password123', // In real app, generate or send reset link
            user_metadata: {
                full_name: fullName,
                role: 'student',
                school_id: schoolId
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

        // 2. Create User Profile
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .insert([{
                id: userId,
                email: studentEmail,
                name: fullName,
                full_name: fullName,
                role: 'student',
                school_id: schoolId,
                is_active: true
            }])
            .select()
            .single();

        if (profileError) throw new Error(`User profile creation failed: ${profileError.message}`);

        // 3. Create Student Record
        const { data: student, error: studentError } = await supabase
            .from('students')
            .insert([{
                user_id: userId,
                school_id: schoolId,
                name: fullName,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth,
                gender: gender,
                grade: enrollmentData.grade || 1,
                section: enrollmentData.section || 'A',
                class_id: enrollmentData.class_id,
                status: 'Active',
                attendance_status: 'Present',
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
                    const { data: newParentProfile } = await supabase.from('users').insert([{
                        id: newParentAuth.user.id,
                        email: parentEmail,
                        name: parentName,
                        role: 'parent',
                        school_id: schoolId
                    }]).select().single();

                    const { data: newParent } = await supabase.from('parents').insert([{
                        user_id: newParentAuth.user.id,
                        name: parentName,
                        email: parentEmail,
                        phone: parentPhone,
                        school_id: schoolId
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
                    school_id: schoolId
                }]);
            }
        }

        return {
            studentId: student.id,
            email: studentEmail
        };
    }

    static async getAllStudents(schoolId: string) {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    static async getStudentById(schoolId: string, id: string) {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId)
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async updateStudent(schoolId: string, id: string, updates: any) {
        const { data, error } = await supabase
            .from('students')
            .update(updates)
            .eq('school_id', schoolId)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async bulkUpdateStatus(schoolId: string, ids: string[], status: string) {
        const { data, error } = await supabase
            .from('students')
            .update({ status })
            .eq('school_id', schoolId)
            .in('id', ids)
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteStudent(schoolId: string, id: string) {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('school_id', schoolId)
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }

    static async getStudentProfileByUserId(userId: string) {
        // Handle demo IDs which are not valid UUIDs
        if (userId.startsWith('demo-')) {
            const role = userId.replace('demo-', '').replace('-id', '');
            const { data, error } = await supabase
                .from('students')
                .select(`
                    *,
                    academic_performance (*),
                    behavior_notes (*),
                    report_cards (*)
                `)
                .ilike('email', `%${role}%`)
                .limit(1)
                .maybeSingle();
            if (error) throw new Error(error.message);
            return data;
        }

        const { data, error } = await supabase
            .from('students')
            .select(`
                *,
                academic_performance (*),
                behavior_notes (*),
                report_cards (*)
            `)
            .eq('user_id', userId)
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getPerformance(studentId: string) {
        const { data, error } = await supabase
            .from('academic_performance')
            .select('*')
            .eq('student_id', studentId);

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async getQuizResults(studentId: string) {
        const { data, error } = await supabase
            .from('quiz_submissions')
            .select('*, quizzes(title, subject)')
            .eq('student_id', studentId)
            .order('submitted_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async linkGuardian(schoolId: string, payload: any) {
        const { studentId, guardianName, guardianEmail, guardianPhone, branchId } = payload;

        if (!studentId || !guardianName || !guardianEmail) {
            throw new Error('Student ID, Guardian Name, and Guardian Email are required.');
        }

        // Initialize Admin client strictly for server-side trusted linking bypassing RLS
        const { createClient } = require('@supabase/supabase-js');
        const config = require('../config/env').config;
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

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
}
