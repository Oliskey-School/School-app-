import React, { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router';

export interface DashboardNavigationState {
    title?: string;
    props?: any;
}

export interface DashboardRouting {
    /** The current screen name, read from the URL (e.g. 'studentList'). */
    view: string;
    /** The screen title passed at navigation time, for the header/breadcrumb. */
    title: string;
    /** Arbitrary data passed at navigation time (e.g. a record id to preview). */
    props: any;
    /** Navigate to a screen, pushing a new browser history entry. */
    navigateTo: (view: string, title?: string, props?: any) => void;
    /** Navigate to a screen WITHOUT growing history — for tab/nav switches
     *  that should replace the current screen rather than stack on top of it
     *  (matches the old setViewStack([{...}]) "reset to a single root" behavior). */
    replaceView: (view: string, title?: string, props?: any) => void;
    /** Step back one screen using the browser's own history. */
    handleBack: () => void;
    /** True once at least one navigateTo() has pushed a screen this session —
     *  the same signal the old viewStack.length > 1 checks used to decide
     *  whether a back button/chevron should render at all. */
    canGoBack: boolean;
}

/**
 * Gives a dashboard (Admin/Teacher/Student/Parent/etc.) real URL-backed
 * navigation instead of an in-memory view stack. Each dashboard used to keep
 * its own hand-rolled `viewStack` array (some persisted to sessionStorage,
 * some not), with its own navigateTo/handleBack pair — meaning no screen had
 * a real, shareable, bookmarkable, or refresh-safe URL, and "back" only
 * worked within that one dashboard's own JS state, not the browser's actual
 * back button.
 *
 * DashboardRouter mounts each dashboard under <Route path="/*">, so the
 * matched wildcard (params['*']) IS this dashboard's own relative path —
 * e.g. "studentList" when the browser is showing /studentList. Only the
 * first path segment is used as the view name; anything after a further
 * "/" is left for the screen itself to interpret if it ever needs a
 * sub-path (none currently do, but this keeps the door open without
 * requiring every screen to be touched now).
 *
 * Complex, non-JSON-safe props (callbacks, live objects) travel via
 * history `state`, exactly as they did before — the old implementations
 * that persisted their view stack to sessionStorage were already limited to
 * JSON-serializable props in practice (JSON.stringify silently drops
 * functions), so this is not a new constraint, just a more honest one: a
 * fresh page load / cross-tab deep link restores the correct VIEW, but not
 * props from a `state` that only exists in that one browser tab's history.
 */
export function useDashboardRouting(defaultView: string, defaultTitle: string): DashboardRouting {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const navigationType = useNavigationType();

    const rawSegment = (params['*'] || '').split('/')[0];
    const view = rawSegment || defaultView;

    const navState = (location.state as DashboardNavigationState | null) || null;
    const title = navState?.title ?? defaultTitle;
    const props = navState?.props ?? {};

    // The History API exposes no "how deep is this session's stack" query —
    // only whether the transition that just happened was a PUSH, POP or
    // REPLACE. Mirror the old viewStack.length bookkeeping with a simple
    // counter driven off that: PUSH grows it, POP (back/forward) shrinks it,
    // REPLACE (tab switches — the old setViewStack([{...}]) "reset to one
    // root" calls) resets it to 0.
    const [depth, setDepth] = useState(0);
    const lastKeyRef = useRef(location.key);
    if (lastKeyRef.current !== location.key) {
        lastKeyRef.current = location.key;
        if (navigationType === 'PUSH') setDepth(d => d + 1);
        else if (navigationType === 'POP') setDepth(d => Math.max(0, d - 1));
        else if (navigationType === 'REPLACE') setDepth(0);
    }

    // Wrapped in startTransition, matching the priority the old setViewStack
    // calls already had — mounting a whole new (possibly heavy, lazy-loaded)
    // screen component is exactly the kind of update React docs recommend
    // deprioritizing so the click/tap itself still feels instant.
    const navigateTo = useCallback((nextView: string, nextTitle: string = '', nextProps: any = {}) => {
        React.startTransition(() => {
            navigate(`/${nextView}`, { state: { title: nextTitle, props: nextProps } });
        });
    }, [navigate]);

    const replaceView = useCallback((nextView: string, nextTitle: string = '', nextProps: any = {}) => {
        React.startTransition(() => {
            navigate(`/${nextView}`, { state: { title: nextTitle, props: nextProps }, replace: true });
        });
    }, [navigate]);

    const handleBack = useCallback(() => {
        React.startTransition(() => {
            navigate(-1);
        });
    }, [navigate]);

    return { view, title, props, navigateTo, replaceView, handleBack, canGoBack: depth > 0 };
}
