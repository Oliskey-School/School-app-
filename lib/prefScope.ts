/**
 * Who the device-stored preferences belong to: `userId:role`, set by
 * AppearanceSync whenever the signed-in user or role changes.
 *
 * Colour scheme, stat-card size and low-data mode used to live under one key per
 * device, so switching users (or demo roles) carried the last person's look
 * over. Keying them by this scope gives each user + role their own.
 */
let scope = '';

export function setPrefScope(next: string): void { scope = next; }
export function getPrefScope(): string { return scope; }

/** `base` scoped to the current user + role; the bare key until one is known. */
export function scopedKey(base: string): string {
    return scope && !scope.endsWith(':') ? `${base}:${scope}` : base;
}
