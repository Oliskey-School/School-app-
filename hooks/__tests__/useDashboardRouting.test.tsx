import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useDashboardRouting } from '../useDashboardRouting';

// The hook reads its view name from the route wildcard (params['*']), which
// only exists inside a matched <Route>, so every render needs a real
// MemoryRouter + Routes tree around it — not just a bare MemoryRouter.
function wrapperWithPath(initialPath: string) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    <Route path="/*" element={children} />
                </Routes>
            </MemoryRouter>
        );
    };
}

describe('useDashboardRouting', () => {
    it('falls back to the default view when the URL has no screen segment', () => {
        const { result } = renderHook(() => useDashboardRouting('overview', 'Admin Dashboard'), {
            wrapper: wrapperWithPath('/'),
        });
        expect(result.current.view).toBe('overview');
        expect(result.current.title).toBe('Admin Dashboard');
        expect(result.current.canGoBack).toBe(false);
    });

    it('reads the view straight from the URL on a deep link', () => {
        const { result } = renderHook(() => useDashboardRouting('overview', 'Admin Dashboard'), {
            wrapper: wrapperWithPath('/feeManagement'),
        });
        expect(result.current.view).toBe('feeManagement');
    });

    it('navigateTo pushes a new view, carries title/props, and flips canGoBack on', () => {
        const { result } = renderHook(() => useDashboardRouting('overview', 'Admin Dashboard'), {
            wrapper: wrapperWithPath('/'),
        });

        act(() => {
            result.current.navigateTo('studentList', 'Students', { classId: 'abc' });
        });

        expect(result.current.view).toBe('studentList');
        expect(result.current.title).toBe('Students');
        expect(result.current.props).toEqual({ classId: 'abc' });
        expect(result.current.canGoBack).toBe(true);
    });

    it('handleBack returns to the previous view and props', () => {
        const { result } = renderHook(() => useDashboardRouting('overview', 'Admin Dashboard'), {
            wrapper: wrapperWithPath('/'),
        });

        act(() => { result.current.navigateTo('studentList', 'Students'); });
        act(() => { result.current.navigateTo('studentProfile', 'Jane Doe', { studentId: '42' }); });
        expect(result.current.view).toBe('studentProfile');

        act(() => { result.current.handleBack(); });
        expect(result.current.view).toBe('studentList');
        expect(result.current.canGoBack).toBe(true);

        act(() => { result.current.handleBack(); });
        expect(result.current.view).toBe('overview');
        expect(result.current.canGoBack).toBe(false);
    });

    it('replaceView swaps the current view without growing history (tab-switch semantics)', () => {
        const { result } = renderHook(() => useDashboardRouting('overview', 'Admin Dashboard'), {
            wrapper: wrapperWithPath('/'),
        });

        act(() => { result.current.navigateTo('studentList', 'Students'); });
        expect(result.current.canGoBack).toBe(true);

        act(() => { result.current.replaceView('feeManagement', 'Fee Management'); });
        expect(result.current.view).toBe('feeManagement');
        // A tab switch resets the back-stack — going back from a freshly
        // selected tab should not land on a screen from a previous tab.
        expect(result.current.canGoBack).toBe(false);
    });

    it('supports many sequential pushes and backs out through all of them', () => {
        const { result } = renderHook(() => useDashboardRouting('overview', 'Admin Dashboard'), {
            wrapper: wrapperWithPath('/'),
        });

        const views = ['a', 'b', 'c', 'd', 'e'];
        for (const v of views) {
            act(() => { result.current.navigateTo(v, v); });
        }
        expect(result.current.view).toBe('e');

        for (let i = views.length - 2; i >= 0; i--) {
            act(() => { result.current.handleBack(); });
            expect(result.current.view).toBe(views[i]);
        }
        // Landed on views[0] ('a') — one more back (to 'overview', the
        // original screen before any push) is still available.
        expect(result.current.canGoBack).toBe(true);

        act(() => { result.current.handleBack(); });
        expect(result.current.view).toBe('overview');
        expect(result.current.canGoBack).toBe(false);
    });
});
