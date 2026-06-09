/**
 * Regression tests for branch isolation (getEffectiveBranchId).
 *
 * Guards the bug where switching to a sub-branch still showed main-branch data:
 * a screen passing a STALE "home branch" must never override the user's live
 * active branch selection. The active branch (validated by the auth middleware
 * into `active_branch_id`) is authoritative.
 */

import { describe, it, expect } from 'vitest';
import { getEffectiveBranchId } from '../../src/utils/branchScope';
import { DEMO_SCHOOL_ID } from '../../src/config/env';

describe('getEffectiveBranchId — active branch is authoritative', () => {
    it('demo admin on a sub-branch ignores a stale main-branch param', () => {
        const root = 'demo-v-abc';
        const lekki = `${root}__lekki`;
        const user = {
            school_id: DEMO_SCHOOL_ID, role: 'ADMIN',
            branch_id: root, allowed_branch_ids: [], active_branch_id: lekki,
        };
        // Screen passes the stale home branch (root/MAIN) — must be ignored.
        expect(getEffectiveBranchId(user, root)).toBe(lekki);
    });

    it('demo admin on the main branch stays on main', () => {
        const root = 'demo-v-abc';
        const user = {
            school_id: DEMO_SCHOOL_ID, role: 'ADMIN',
            branch_id: root, allowed_branch_ids: [], active_branch_id: root,
        };
        expect(getEffectiveBranchId(user, `${root}__lekki`)).toBe(root);
    });

    it('multi-branch teacher uses the switched-to branch, not a stale one', () => {
        const user = {
            school_id: 'live-school', role: 'TEACHER',
            branch_id: 'B1', allowed_branch_ids: ['B2'], active_branch_id: 'B2',
        };
        // Stale B1 passed by a screen must NOT win over the active B2.
        expect(getEffectiveBranchId(user, 'B1')).toBe('B2');
    });

    it('multi-branch teacher can never be granted an all-branches view', () => {
        const user = {
            school_id: 'live-school', role: 'TEACHER',
            branch_id: 'B1', allowed_branch_ids: ['B2'], active_branch_id: 'B1',
        };
        expect(getEffectiveBranchId(user, 'all')).toBe('B1');
    });

    it('branch-scoped admin stays locked to their own branch', () => {
        const user = {
            school_id: 'live-school', role: 'ADMIN',
            branch_id: 'B1', allowed_branch_ids: [], active_branch_id: 'B1',
        };
        // Even a malicious request for another branch is ignored.
        expect(getEffectiveBranchId(user, 'B2')).toBe('B1');
    });

    it('main admin on "All Branches" is unrestricted', () => {
        const user = {
            school_id: 'live-school', role: 'ADMIN',
            branch_id: null, allowed_branch_ids: [], active_branch_id: null,
        };
        expect(getEffectiveBranchId(user, undefined)).toBeUndefined();
    });

    it('main admin on "All" can still filter to a specific branch', () => {
        const user = {
            school_id: 'live-school', role: 'ADMIN',
            branch_id: null, allowed_branch_ids: [], active_branch_id: null,
        };
        expect(getEffectiveBranchId(user, 'B3')).toBe('B3');
    });

    it('main admin focused on a branch does not leak another branch passed by a screen', () => {
        const user = {
            school_id: 'live-school', role: 'ADMIN',
            branch_id: null, allowed_branch_ids: [], active_branch_id: 'B1',
        };
        expect(getEffectiveBranchId(user, 'B2')).toBe('B1');
    });
});
