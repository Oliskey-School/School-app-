import React, { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router';

export interface DashboardNavigationState {
    title?: string;
    /** Key into the in-memory props map (see navigateTo) — never the props
     *  themselves, since history.pushState requires structured-cloneable
     *  data and rejects anything containing a function. */
    navId?: string;
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
 * Props travel through an in-memory ref map, not through history `state`
 * directly: `state` is handed to the browser's real history.pushState,
 * which runs the structured-clone algorithm and THROWS if the value
 * contains a function (several callers pass callbacks like `onSave` in
 * props). Only a small, always-cloneable `navId` key goes into `state`;
 * the actual props object is looked up from the ref map by that key. This
 * has the same practical ceiling the old sessionStorage-persisted view
 * stacks had (JSON.stringify silently dropped functions there too): a
 * fresh page load / cross-tab deep link restores the correct VIEW, but not
 * props from a navigation that only exists in this one tab's memory.
 */
export function useDashboardRouting(defaultView: string, defaultTitle: string): DashboardRouting {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const navigationType = useNavigationType();

    const rawSegment = (params['*'] || '').split('/')[0];
    const view = rawSegment || defaultView;

    const propsMapRef = useRef<Map<string, any>>(new Map());
    const navIdCounterRef = useRef(0);

    const navState = (location.state as DashboardNavigationState | null) || null;
    const title = navState?.title ?? defaultTitle;
    const props = (navState?.navId ? propsMapRef.current.get(navState.navId) : undefined) ?? {};

    // The History API exposes no "how deep is this session's stack" query —
    // only whether the transition that just happened was a PUSH, POP or
    // REPLACE. Mirror the old viewStack.length bookkeeping with a simple
    // counter driven off that: PUSH grows it, POP (back/forward) shrinks it,
    // REPLACE (tab switches — the old setViewStack([{...}]) "reset to one
    // root" calls) resets it to 0.
    //
    // Both the "have we already seen this location.key" check AND the depth
    // itself live in useState (React's documented-safe "adjust state during
    // render" pattern — see react.dev/reference/react/useState#storing-information-from-previous-renders),
    // not a useRef mutated inline. A ref written during render is not safe
    // under concurrent rendering: React can invoke a component's render
    // function more than once for a single update (and discard a result),
    // and a raw ref mutation is not undone when that happens, so a second
    // invocation would see the ref already updated and silently skip the
    // depth update the first (discarded) pass "consumed" — observed in
    // practice as React logging "error during concurrent rendering... was
    // able to recover" under rapid, repeated navigation. Two state values
    // are replay-safe: every render (re-tried or not) computes the same
    // depth from the same last-committed (prevKey, depth) pair.
    const [prevKey, setPrevKey] = useState(location.key);
    const [depth, setDepth] = useState(0);
    if (prevKey !== location.key) {
        setPrevKey(location.key);
        if (navigationType === 'PUSH') setDepth(depth + 1);
        else if (navigationType === 'POP') setDepth(Math.max(0, depth - 1));
        else if (navigationType === 'REPLACE') setDepth(0);
    }

    // Wrapped in startTransition, matching the priority the old setViewStack
    // calls already had — mounting a whole new (possibly heavy, lazy-loaded)
    // screen component is exactly the kind of update React docs recommend
    // deprioritizing so the click/tap itself still feels instant.
    const navigateTo = useCallback((nextView: string, nextTitle: string = '', nextProps: any = {}) => {
        const navId = `n${++navIdCounterRef.current}`;
        propsMapRef.current.set(navId, nextProps);
        React.startTransition(() => {
            navigate(`/${nextView}`, { state: { title: nextTitle, navId } });
        });
    }, [navigate]);

    const replaceView = useCallback((nextView: string, nextTitle: string = '', nextProps: any = {}) => {
        const navId = `n${++navIdCounterRef.current}`;
        propsMapRef.current.set(navId, nextProps);
        React.startTransition(() => {
            navigate(`/${nextView}`, { state: { title: nextTitle, navId }, replace: true });
        });
    }, [navigate]);

    const handleBack = useCallback(() => {
        React.startTransition(() => {
            navigate(-1);
        });
    }, [navigate]);

    return { view, title, props, navigateTo, replaceView, handleBack, canGoBack: depth > 0 };
}
