/**
 * Per-school install branding.
 *
 * The browser decides the installed app's icon and name from
 * <link rel="manifest"> (and, on iOS, <link rel="apple-touch-icon">). Pointing
 * both at the signed-in user's school (served by /api/schools/:id/...) makes
 * "Download app" install the SCHOOL's logo and name; a school without a logo
 * is served the default Oliskey icons by that same endpoint, so nothing can
 * break. The last school is remembered so the links are already correct on
 * the next page load, before the browser runs its installability check.
 */
const LAST_SCHOOL_KEY = 'pwa_school_id';
const DEFAULT_MANIFEST = '/manifest.json';
const DEFAULT_TOUCH_ICON = '/icons/app-icon-180.png';

const setLink = (rel: string, href: string) => {
    let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) { link = document.createElement('link'); link.rel = rel; document.head.appendChild(link); }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
};

export function applySchoolBranding(schoolId: string | null | undefined): void {
    if (typeof document === 'undefined') return;
    const id = schoolId && /^[A-Za-z0-9_-]{1,64}$/.test(schoolId) ? schoolId : null;
    setLink('manifest', id ? `/api/schools/${id}/manifest.webmanifest` : DEFAULT_MANIFEST);
    setLink('apple-touch-icon', id ? `/api/schools/${id}/icon/180` : DEFAULT_TOUCH_ICON);
    try {
        if (id) localStorage.setItem(LAST_SCHOOL_KEY, id);
        else localStorage.removeItem(LAST_SCHOOL_KEY);
    } catch { /* storage unavailable */ }
}

/** Call once at startup, before the app renders. */
export function applyRememberedSchoolBranding(): void {
    try {
        const id = localStorage.getItem(LAST_SCHOOL_KEY);
        if (id) applySchoolBranding(id);
    } catch { /* ignore */ }
}
