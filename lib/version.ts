// Semantic-version helpers for the "System Update Required" check.
//
// Previously the app compared versions with a raw string `!==`, which is wrong on
// two counts: "0.5.9" !== "0.5.27" is true but 0.5.9 is actually OLDER, and any
// difference (even running a NEWER build than a stale server-side lock) wrongly
// triggered an "update" prompt pointing at the older version. These helpers do a
// real numeric comparison so we only prompt when the user is genuinely behind.

/**
 * Compare two dot-separated numeric versions.
 * Returns -1 if a < b, 0 if equal, 1 if a > b. Missing/garbage parts count as 0.
 */
export function compareVersions(a?: string | null, b?: string | null): number {
    const parse = (v?: string | null) =>
        String(v ?? '0')
            .trim()
            .replace(/^v/i, '')
            .split('.')
            .map(n => parseInt(n, 10) || 0);
    const pa = parse(a);
    const pb = parse(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const x = pa[i] || 0;
        const y = pb[i] || 0;
        if (x > y) return 1;
        if (x < y) return -1;
    }
    return 0;
}

/** Return the highest of the given versions (ignoring empty/null values). */
export function maxVersion(...versions: (string | null | undefined)[]): string {
    return versions
        .filter((v): v is string => !!v && /\d/.test(v))
        .reduce((max, v) => (compareVersions(v, max) > 0 ? v : max), '0.0.0');
}

/** True only when `current` is strictly older than `latest`. */
export function isOutdated(current?: string | null, latest?: string | null): boolean {
    if (!latest) return false;
    return compareVersions(current, latest) < 0;
}
