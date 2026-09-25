/**
 * The single definition of what a notification preference IS.
 *
 * ROOT CAUSE this replaces: the settings screen sent
 *     { digest_time: "19:00", categories: [{ id, mode, channel }, ...] }
 * while NotificationService.updateSettingsByUserId kept only values that were
 * `typeof value === "boolean"`. An array is not a boolean and neither is a time
 * string, so BOTH were silently dropped and an empty object was written. The
 * read side then returned `result.categories` — the inner blob rather than the
 * row — so `settings.digest_time` and `settings.categories` were both undefined
 * on load. Nothing the user chose was ever saved, and nothing was ever restored.
 *
 * That boolean filter existed for a good reason: the previous code persisted the
 * request body verbatim, so any extra key a caller sent (school_id, other ids…)
 * landed in the JSON column. The fix is to validate against a known shape rather
 * than to guess from a value's type — which is what this module is for. Nothing
 * outside CATEGORY_IDS / MODES / CHANNELS can reach the database.
 */

export const CATEGORY_IDS = [
    'homework', 'fees', 'attendance', 'emergency', 'events', 'behavior', 'general',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const MODES = ['instant', 'digest', 'off'] as const;
export type Mode = (typeof MODES)[number];

export const CHANNELS = ['inapp', 'email', 'push', 'sms', 'whatsapp'] as const;
export type Channel = (typeof CHANNELS)[number];

export interface CategoryPreference {
    id: CategoryId;
    mode: Mode;
    channel: Channel;
}

export interface NotificationPreferences {
    digest_time: string;               // "HH:MM", 24h
    categories: CategoryPreference[];
}

/**
 * Emergency alerts are deliberately not user-silenceable: a school closure or a
 * safety alert must reach people. The UI blocks it and the server enforces it,
 * because a client can send whatever it likes.
 */
export const ALWAYS_INSTANT: CategoryId[] = ['emergency'];

const DEFAULTS: Record<CategoryId, { mode: Mode; channel: Channel }> = {
    homework:   { mode: 'digest',  channel: 'inapp' },
    fees:       { mode: 'instant', channel: 'email' },
    attendance: { mode: 'instant', channel: 'inapp' },
    emergency:  { mode: 'instant', channel: 'email' },
    events:     { mode: 'digest',  channel: 'inapp' },
    behavior:   { mode: 'instant', channel: 'inapp' },
    general:    { mode: 'digest',  channel: 'inapp' },
};

export function defaultPreferences(): NotificationPreferences {
    return {
        digest_time: '19:00',
        categories: CATEGORY_IDS.map(id => ({ id, ...DEFAULTS[id] })),
    };
}

/** "19:00" / "7:5" -> "19:00" / "07:05"; anything else -> null. */
function normaliseTime(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Accept anything and return a valid preference set.
 *
 * Handles three inputs: the current array shape, the legacy flat boolean blob
 * that older rows still hold (`{ emailAlerts: true, ... }` — no per-category
 * mode or channel, so it carries no information worth migrating and falls back
 * to defaults), and junk.
 */
export function sanitisePreferences(input: any): NotificationPreferences {
    const base = defaultPreferences();
    if (!input || typeof input !== 'object') return base;

    const digest_time = normaliseTime(input.digest_time) ?? base.digest_time;

    const incoming: any[] = Array.isArray(input.categories) ? input.categories
        : Array.isArray(input) ? input
        : [];

    const byId = new Map<string, CategoryPreference>();
    for (const raw of incoming) {
        if (!raw || typeof raw !== 'object') continue;
        const id = String(raw.id) as CategoryId;
        if (!CATEGORY_IDS.includes(id)) continue;                 // unknown category: ignored
        const mode = MODES.includes(raw.mode) ? (raw.mode as Mode) : DEFAULTS[id].mode;
        const channel = CHANNELS.includes(raw.channel) ? (raw.channel as Channel) : DEFAULTS[id].channel;
        byId.set(id, {
            id,
            mode: ALWAYS_INSTANT.includes(id) ? 'instant' : mode,  // enforced server-side
            channel,
        });
    }

    return {
        digest_time,
        categories: CATEGORY_IDS.map(id => byId.get(id) ?? { id, ...DEFAULTS[id] }),
    };
}

/** The preference that applies to one category, always defined. */
export function preferenceFor(prefs: NotificationPreferences, category: CategoryId): CategoryPreference {
    return prefs.categories.find(c => c.id === category) ?? { id: category, ...DEFAULTS[category] };
}

/**
 * Which delivery channels this deployment can actually use right now.
 *
 * Only in-app and email are implemented: in-app writes a Notification row and
 * emits over Socket.io, email goes through EmailService's SMTP transport. push,
 * sms and whatsapp have no server-side sender and no provider credentials
 * anywhere in the codebase — offering them as if they worked would silently
 * drop messages, so the API reports them as unavailable and the settings screen
 * marks them "Not set up". Adding a provider is then a matter of implementing
 * its sender and flipping the flag here.
 */
export function channelAvailability(): Record<Channel, boolean> {
    const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    return {
        inapp: true,
        email: smtpConfigured,
        push: false,
        sms: false,
        whatsapp: false,
    };
}
