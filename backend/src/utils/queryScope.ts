/**
 * Query Scoping Utilities for Multi-Tenant Isolation
 * 
 * This module provides higher-order functions to wrap Prisma queries with
 * automatic school_id and branch_id filtering. It ensures consistent
 * tenant isolation across all data access operations.
 * 
 * Usage:
 *   const students = await withSchoolScope(req, prisma.student.findMany)({
 *       where: { grade: 10 },
 *   });
 * 
 *   const classes = await withSchoolBranchScope(req, prisma.class.findMany)({
 *       where: { name: 'JSS1' },
 *   });
 */

import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

/**
 * Request interface with school/branch context
 */
export interface ScopedRequest extends Request {
    user?: any;
    school_id?: string;
    branch_id?: string;
}

/**
 * Wraps a Prisma query to automatically add school_id filter
 * 
 * Use this for tables that have school_id but not branch_id,
 * or for multi-school queries where branch isolation is not needed.
 * 
 * @param req - Express request with school_id set by auth middleware
 * @param queryFn - Prisma query function (e.g., prisma.student.findMany)
 * @returns Scoped query function that auto-adds school_id filter
 * 
 * @example
 * const students = await withSchoolScope(req, prisma.student.findMany)({
 *   where: { grade: 10 },
 *   include: { parents: true }
 * });
 * // Executed query automatically adds: where: { ...filters, school_id: req.school_id }
 */
export function withSchoolScope<T extends (...args: any[]) => Promise<any>>(
    req: ScopedRequest,
    queryFn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...[args]: Parameters<T>) => {
        if (!req.school_id) {
            throw new Error(
                'Missing school_id in request context. ' +
                'Ensure authenticate middleware is applied and sets req.school_id'
            );
        }

        const where = {
            ...(args?.where || {}),
            school_id: req.school_id
        };

        return queryFn({ ...args, where }) as ReturnType<T>;
    };
}

/**
 * Wraps a Prisma query to automatically add school_id AND branch_id filters
 * 
 * Use this for tables that have both school_id and branch_id fields.
 * Supports multi-branch users by allowing queries across their allowed branches.
 * 
 * @param req - Express request with school_id and branch_id set by auth middleware
 * @param queryFn - Prisma query function
 * @param allowCrossBranch - If true, allows querying all branches in school (for admins)
 * @returns Scoped query function with school + branch filtering
 * 
 * @example
 * // Single branch context (teacher, student, parent)
 * const classesInBranch = await withSchoolBranchScope(req, prisma.class.findMany)({
 *   where: { name: 'JSS1' }
 * });
 * // Auto filters: school_id + branch_id
 * 
 * // Multi-branch context (school admin)
 * const allClasses = await withSchoolBranchScope(req, prisma.class.findMany, true)({
 *   where: {}
 * });
 * // Auto filters: school_id only (all branches visible)
 */
export function withSchoolBranchScope<T extends (...args: any[]) => Promise<any>>(
    req: ScopedRequest,
    queryFn: T,
    allowCrossBranch: boolean = false
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...[args]: Parameters<T>) => {
        if (!req.school_id) {
            throw new Error(
                'Missing school_id in request context. ' +
                'Ensure authenticate middleware is applied and sets req.school_id'
            );
        }

        let where: any = {
            ...(args?.where || {}),
            school_id: req.school_id
        };

        // If branch_id is present and not allowing cross-branch, add branch filter
        if (req.branch_id && !allowCrossBranch) {
            where.branch_id = req.branch_id;
        }

        return queryFn({ ...args, where }) as ReturnType<T>;
    };
}

/**
 * Wraps a Prisma query to add school_id filter AND ensure the record's branch_id
 * matches user's allowed branches (for multi-branch users like teachers assigned to multiple branches)
 * 
 * Use this when a user can access multiple branches but query should respect all their assignments.
 * 
 * @param req - Express request with school_id and allowed_branch_ids from auth
 * @param queryFn - Prisma query function
 * @returns Scoped query with school_id + branch_id IN allowed_branch_ids
 * 
 * @example
 * // Teacher assigned to multiple branches
 * const allAssignments = await withSchoolMultiBranchScope(req, prisma.assignment.findMany)({
 *   where: { subject: 'Mathematics' }
 * });
 * // Auto filters: school_id + (branch_id IN user.allowed_branch_ids)
 */
export function withSchoolMultiBranchScope<T extends (...args: any[]) => Promise<any>>(
    req: ScopedRequest,
    queryFn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...[args]: Parameters<T>) => {
        if (!req.school_id) {
            throw new Error(
                'Missing school_id in request context. ' +
                'Ensure authenticate middleware is applied and sets req.school_id'
            );
        }

        const allowedBranchIds = [
            req.branch_id,
            ...(req.user?.allowed_branch_ids || [])
        ].filter(Boolean);

        let where: any = {
            ...(args?.where || {}),
            school_id: req.school_id
        };

        // If there are allowed branches, add IN clause
        if (allowedBranchIds.length > 0) {
            where.branch_id = { in: allowedBranchIds };
        }

        return queryFn({ ...args, where }) as ReturnType<T>;
    };
}

/**
 * Wraps a Prisma CREATE operation to automatically set school_id and optionally branch_id
 * 
 * Use this when creating new records to ensure they're always created with the correct tenant context.
 * 
 * @param req - Express request with school_id/branch_id context
 * @param queryFn - Prisma create function (e.g., prisma.student.create)
 * @param includeBranch - If true, also sets branch_id from request context
 * @returns Create function with auto-populated school_id (and branch_id)
 * 
 * @example
 * // Create student (school-scoped only)
 * const student = await withSchoolScopeCreate(req, prisma.student.create)({
 *   data: { full_name: 'John Doe', email: 'john@example.com' }
 * });
 * // Auto sets: data.school_id = req.school_id
 * 
 * // Create class (school + branch)
 * const cls = await withSchoolScopeCreate(req, prisma.class.create, true)({
 *   data: { name: 'JSS1', form_master: 'Mr. Smith' }
 * });
 * // Auto sets: data.school_id + data.branch_id = req.branch_id
 */
export function withSchoolScopeCreate<T extends (...args: any[]) => Promise<any>>(
    req: ScopedRequest,
    queryFn: T,
    includeBranch: boolean = false
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...[args]: Parameters<T>) => {
        if (!req.school_id) {
            throw new Error(
                'Missing school_id in request context. ' +
                'Ensure authenticate middleware is applied and sets req.school_id'
            );
        }

        const data = {
            ...(args?.data || {}),
            school_id: req.school_id
        };

        if (includeBranch && req.branch_id) {
            data.branch_id = req.branch_id;
        }

        return queryFn({ ...args, data }) as ReturnType<T>;
    };
}

/**
 * Wraps a Prisma UPDATE/DELETE operation to ensure only records
 * within the user's school (and optionally branch) scope can be modified.
 * 
 * Adds a WHERE clause that scopes updates to current school/branch.
 * 
 * @param req - Express request with school_id context
 * @param queryFn - Prisma update/delete function
 * @param includeBranch - If true, also ensures branch_id matches
 * @returns Update/delete function with automatic scope enforcement
 * 
 * @example
 * // Update student (school-scoped)
 * const updated = await withSchoolScopeUpdate(req, prisma.student.updateUnique)({
 *   where: { id: studentId },
 *   data: { grade: 11 }
 * });
 * // Auto enforces: where.school_id = req.school_id
 * 
 * // Update class (school + branch)
 * const updated = await withSchoolScopeUpdate(req, prisma.class.update, true)({
 *   where: { id: classId },
 *   data: { name: 'JSS2' }
 * });
 * // Auto enforces: where.school_id + where.branch_id = req.branch_id
 */
export function withSchoolScopeUpdate<T extends (...args: any[]) => Promise<any>>(
    req: ScopedRequest,
    queryFn: T,
    includeBranch: boolean = false
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...[args]: Parameters<T>) => {
        if (!req.school_id) {
            throw new Error(
                'Missing school_id in request context. ' +
                'Ensure authenticate middleware is applied and sets req.school_id'
            );
        }

        let where = {
            ...(args?.where || {}),
            school_id: req.school_id
        };

        if (includeBranch && req.branch_id) {
            where.branch_id = req.branch_id;
        }

        return queryFn({ ...args, where }) as ReturnType<T>;
    };
}

/**
 * Validates that a record belongs to the current school/branch before returning it
 * 
 * Use this for single-record queries (findUnique, findFirst) to ensure
 * a user cannot fetch records from other schools/branches.
 * 
 * @param req - Express request with school_id context
 * @param record - The record to validate
 * @param includeBranch - If true, also validates branch_id
 * @throws Error if record does not belong to the user's school/branch
 * 
 * @example
 * const student = await prisma.student.findUnique({ where: { id: studentId } });
 * 
 * // Validate it's in this school
 * validateRecordScope(req, student);
 * 
 * // Validate it's in this school AND branch
 * validateRecordScope(req, student, true);
 */
export function validateRecordScope(
    req: ScopedRequest,
    record: any,
    includeBranch: boolean = false
): void {
    if (!record) {
        return; // No record to validate
    }

    if (record.school_id !== req.school_id) {
        throw new Error(
            `Record does not belong to school ${req.school_id}. ` +
            `Attempted access to school ${record.school_id}`
        );
    }

    if (includeBranch && record.branch_id !== req.branch_id) {
        throw new Error(
            `Record does not belong to branch ${req.branch_id}. ` +
            `Attempted access to branch ${record.branch_id}`
        );
    }
}

/**
 * Creates a safe fetch wrapper that validates scope before returning data
 * 
 * Combines query execution with automatic scope validation in one call.
 * 
 * @param req - Express request with school/branch context
 * @param queryFn - Async function that returns a record or records
 * @param includeBranch - If true, validates branch_id as well
 * @returns Result from queryFn, validated for scope
 * 
 * @example
 * // Fetch single student with validation
 * const student = await safeFetch(req, () =>
 *   prisma.student.findUnique({ where: { id: studentId } })
 * );
 * // Automatically validates the returned student is in req.school_id
 */
export async function safeFetch<T>(
    req: ScopedRequest,
    queryFn: () => Promise<T>,
    includeBranch: boolean = false
): Promise<T> {
    const result = await queryFn();
    
    if (Array.isArray(result)) {
        // For arrays, validate each record
        result.forEach(record => validateRecordScope(req, record, includeBranch));
    } else if (result) {
        // For single records
        validateRecordScope(req, result, includeBranch);
    }
    
    return result;
}

/**
 * Extracts school_id and branch_id from request into a clean context object
 * 
 * Useful for passing to services or logging tenant context.
 * 
 * @param req - Express request with school/branch context
 * @returns Object with { school_id, branch_id, user_id, user_role }
 * 
 * @example
 * const context = getTenantContext(req);
 * console.log(`Request in ${context.school_id} by ${context.user_role}`);
 */
export function getTenantContext(req: ScopedRequest) {
    return {
        school_id: req.school_id,
        branch_id: req.branch_id,
        user_id: req.user?.id,
        user_role: req.user?.role,
        user_school_id: req.user?.school_id,
        user_branch_id: req.user?.branch_id,
        allowed_branch_ids: req.user?.allowed_branch_ids || []
    };
}
