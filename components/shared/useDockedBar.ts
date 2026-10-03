import { useCallback, useEffect, useState } from 'react';

/**
 * Publishes an element's height as a CSS variable on the root element.
 *
 * Several pieces of chrome are pinned to the bottom of the screen and know
 * nothing about each other: the bottom navigation, a screen's docked "Admin
 * Actions" bar, and the floating install button. Each is `position: fixed`, so
 * none of them can see the others in the layout, and they were landing on top
 * of one another.
 *
 * Letting each one publish its measured height gives the others something to
 * stack against, so the bar sits flush on the navigation with no gap for the
 * page to show through, and the floating button clears both.
 *
 * A bar that is not actually pinned — the desktop layouts put it back into
 * normal flow — publishes 0, so nothing is pushed up for a bar that is simply
 * part of the page.
 */
export function usePublishedHeight<T extends HTMLElement = HTMLDivElement>(cssVar: string) {
    // The element is followed through a callback ref, not a one-off effect: the
    // bottom nav is unmounted on full-screen views (chat, AI assistant) and a
    // new <nav> is mounted on return. An effect keyed only on cssVar kept
    // observing the detached node, published 0px from it, and never re-attached
    // — so the floating buttons dropped onto the nav for the rest of the visit.
    const [el, setEl] = useState<T | null>(null);
    const ref = useCallback((node: T | null) => setEl(node), []);

    useEffect(() => {
        if (!el) return;
        const root = document.documentElement;

        const publish = () => {
            if (!el.isConnected) return; // a detached node measures 0 — ignore it
            const pinned = /fixed|sticky/.test(getComputedStyle(el).position);
            root.style.setProperty(cssVar, pinned ? `${el.offsetHeight}px` : '0px');
        };

        publish();

        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null;
        observer?.observe(el);
        window.addEventListener('resize', publish);

        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', publish);
            root.style.removeProperty(cssVar);
        };
    }, [cssVar, el]);

    return ref;
}

/** A screen's docked action bar, stacked above the bottom navigation. */
export const useDockedBar = <T extends HTMLElement = HTMLDivElement>() =>
    usePublishedHeight<T>('--docked-bar-height');

/** The app's bottom navigation. Publishes 0 once it is hidden on desktop. */
export const useBottomNavHeight = <T extends HTMLElement = HTMLElement>() =>
    usePublishedHeight<T>('--bottom-nav-height');
