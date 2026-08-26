import { useEffect, useRef, useCallback } from 'react';

/**
 * Warns before an in-progress edit is thrown away.
 *
 * Teacher screens routinely hold tens of unsaved values at once (a gradebook of
 * 30 rows, a full attendance register, a long assignment description). Before
 * this hook nothing in the app guarded that: closing the tab, reloading, or
 * pressing a screen's own Back/Close control discarded everything silently.
 *
 * Covers the two ways the work can be lost:
 *  - the browser leaving the page (`beforeunload`), and
 *  - the app's own in-SPA back/close controls, via `confirmNavigation`.
 *
 * Usage:
 *   const { confirmNavigation } = useUnsavedChangesGuard(hasUnsavedChanges);
 *   <button onClick={() => confirmNavigation(handleBack)}>Close</button>
 */
export function useUnsavedChangesGuard(
    isDirty: boolean,
    message = 'You have unsaved changes. Leave this page and lose them?'
) {
    // Read through a ref so the listener never needs re-attaching on every
    // keystroke that flips the dirty flag.
    const isDirtyRef = useRef(isDirty);
    isDirtyRef.current = isDirty;

    const messageRef = useRef(message);
    messageRef.current = message;

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!isDirtyRef.current) return;
            e.preventDefault();
            // Browsers ignore custom text now and show their own wording, but the
            // assignment is still what triggers the prompt at all.
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    /**
     * Wraps an in-app navigation. Runs `proceed` immediately when there is
     * nothing to lose, otherwise asks first. Returns whether it proceeded.
     */
    const confirmNavigation = useCallback((proceed: () => void): boolean => {
        if (!isDirtyRef.current) {
            proceed();
            return true;
        }
        if (window.confirm(messageRef.current)) {
            proceed();
            return true;
        }
        return false;
    }, []);

    return { confirmNavigation };
}

export default useUnsavedChangesGuard;
