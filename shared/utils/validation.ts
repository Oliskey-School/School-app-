import * as yup from 'yup';

/**
 * SHARED VALIDATION SCHEMAS
 * These are used by both the Frontend (Forms) and Backend (API Controllers)
 * to ensure strict data integrity and security context.
 */

// 1. Common Fields
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const tenantContext = {
    school_id: yup.string().matches(UUID_REGEX, 'Invalid School ID').required('School ID is mandatory'),
    branch_id: yup.string().matches(UUID_REGEX, 'Invalid Branch ID').nullable(),
};

// 2. Student Schema
export const studentSchema = yup.object().shape({
    ...tenantContext,
    name: yup.string().min(2, 'Name too short').max(100, 'Name too long').required(),
    firstName: yup.string().required(),
    lastName: yup.string().required(),
    grade: yup.number().integer().min(0).max(12).required(),
    section: yup.string().max(10).required(),
    gender: yup.string().oneOf(['male', 'female', 'other']),
    email: yup.string().email('Invalid email address').nullable(),
    enrollment_date: yup.date().default(() => new Date()),
    status: yup.string().oneOf(['active', 'inactive', 'graduated', 'withdrawn']).default('active'),
});

// 3. Teacher Schema
export const teacherSchema = yup.object().shape({
    ...tenantContext,
    full_name: yup.string().min(2).max(100).required(),
    email: yup.string().email().required(),
    specialization: yup.string().nullable(),
    joining_date: yup.date().required(),
    status: yup.string().oneOf(['active', 'inactive', 'on_leave']).default('active'),
});

// 4. School Schema (Admin/SaaS Level)
export const schoolSchema = yup.object().shape({
    name: yup.string().min(2).max(150).required(),
    primary_color: yup.string().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
    address: yup.string().required(),
    phone: yup.string().nullable(),
    email: yup.string().email().required(),
    logo_url: yup.string().url().nullable(),
    plan_id: yup.string().matches(UUID_REGEX).required(),
});

// 5. Branch Schema
export const branchSchema = yup.object().shape({
    school_id: yup.string().matches(UUID_REGEX).required(),
    name: yup.string().min(2).max(100).required(),
    is_main: yup.boolean().default(false),
    location: yup.string().nullable(),
});
