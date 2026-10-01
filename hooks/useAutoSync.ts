import { useEffect, useRef } from 'react';

/**
 * Re-run a screen's data loader when something it cares about changes elsewhere.
 *
 * @param tables   table names to watch, or ['*'] for everything
 * @param onUpdate what to run when one of them changes
 *
 * ROOT CAUSE this fixes: the effect used to list `onUpdate` in its dependency
 * array. Almost every caller passes an inline arrow or a useCallback whose deps
 * include a prop object, so the callback had a new identity on essentially every
 * render — which tore down and re-attached the window listener on every render.
 * On a screen that re-rendered while data was arriving, that meant the listener
 * could be missing at the moment an event fired, so a live update was sometimes
 * dropped, and the constant add/remove churn showed up in profiles.
 *
 * The callback now lives in a ref that is kept current, and the subscription
 * depends only on the table list. The listener is attached exactly once per
 * screen and always calls the latest callback.
 *
 * NOTE for callers: a refresh triggered from here is a BACKGROUND refresh. Do
 * not flip the screen back to its loading state in response — that flashes a
 * skeleton over content the user is already reading and replays entry
 * animations, which reads as the screen blinking. Load into the existing view
 * and swap the data in. See FeeStatusScreen's `loadFees({ background: true })`.
 */
export const useAutoSync = (tables: string[], onUpdate: () => void) => {
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    const key = tables.join(',');

    useEffect(() => {
        if (tables.length === 0) return;
        const watched = key.split(',');

        const handleRealtimeUpdate = (event: any) => {
            const { table } = event.detail || {};
            // '__all__' is a global refresh signal (e.g. a branch switch) that every
            // screen must honor regardless of which tables it normally watches.
            if (table === '__all__' || watched.includes(table) || watched.includes('*')) {
                onUpdateRef.current();
            }
        };

        window.addEventListener('realtime-update', handleRealtimeUpdate);
        return () => window.removeEventListener('realtime-update', handleRealtimeUpdate);
    }, [key]);
};
