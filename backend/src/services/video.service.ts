import { config } from '../config/env';

/**
 * Daily.co video-room service — the server-side gateway for live class rooms.
 *
 * The Daily API key lives ONLY here. Daily's own docs state the REST API "is
 * best kept server-side", so the browser never receives the key: it calls
 * POST /api/video/room and gets back nothing but a join URL.
 *
 * Room naming is deterministic from the virtual-class session id, so the
 * teacher and every student in that session land in the SAME room without any
 * extra coordination — same guarantee the old Jitsi room-name scheme gave.
 */

const DAILY_API = 'https://api.daily.co/v1';

export interface VideoRoom {
    url: string;
    name: string;
}

export class VideoService {
    static isConfigured(): boolean {
        return !!config.dailyApiKey;
    }

    /** Deterministic, Daily-safe room name derived from the session id. */
    private static roomNameFor(sessionId: string): string {
        // Daily room names allow letters, numbers, dashes and underscores.
        const safe = String(sessionId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
        return `oliskey-${safe}`;
    }

    private static headers() {
        return {
            'Authorization': `Bearer ${config.dailyApiKey}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Returns the join URL for a session's room, creating it on first use.
     *
     * @param sessionId       virtual class session id (shared by all participants)
     * @param durationMinutes how long the room stays valid; Daily deletes it after
     *                        `exp`, so stale class links can't be rejoined later.
     */
    static async getOrCreateRoom(sessionId: string, durationMinutes = 240): Promise<VideoRoom> {
        if (!this.isConfigured()) {
            throw Object.assign(new Error('Video calling is not configured on this server'), { status: 503 });
        }

        const name = this.roomNameFor(sessionId);

        // Reuse the room if this session already has one (e.g. a re-join, or the
        // teacher starting then students arriving).
        const existing = await fetch(`${DAILY_API}/rooms/${name}`, { headers: this.headers() });
        if (existing.ok) {
            const room = await existing.json() as { url?: string };
            if (room?.url) return { url: room.url, name };
        } else if (existing.status !== 404) {
            // 404 simply means "not created yet" — anything else is a real fault
            // and should surface rather than be masked by a create attempt.
            const detail = await existing.text().catch(() => '');
            throw Object.assign(
                new Error(`Daily API error (${existing.status})`),
                { status: 502, detail: detail.slice(0, 500) },
            );
        }

        const created = await fetch(`${DAILY_API}/rooms`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                name,
                privacy: 'public',
                properties: {
                    // Auto-expire so class links die with the class instead of
                    // remaining joinable indefinitely.
                    exp: Math.floor(Date.now() / 1000) + durationMinutes * 60,
                    enable_chat: true,
                    enable_screenshare: true,
                },
            }),
        });

        if (!created.ok) {
            const detail = await created.text().catch(() => '');

            // Idempotency guard. Two callers routinely race here: the teacher and a
            // student joining at once, or React re-running the mount effect. Both
            // GET a 404, both POST, and Daily rejects the loser with "already
            // exists". But the room DOES exist now — which is exactly the outcome we
            // wanted — so re-read it instead of failing the join.
            if (/already exists/i.test(detail)) {
                const retry = await fetch(`${DAILY_API}/rooms/${name}`, { headers: this.headers() });
                if (retry.ok) {
                    const room = await retry.json() as { url?: string };
                    if (room?.url) return { url: room.url, name };
                }
            }

            // Surface Daily's OWN reason rather than a bare status code — a generic
            // "Daily API 400" sends you hunting through app code for what is almost
            // always an account-side setting.
            let reason = '';
            try {
                const parsed = JSON.parse(detail) as { error?: string; info?: string };
                reason = parsed.info || parsed.error || '';
            } catch { /* non-JSON body — fall through to the raw text below */ }

            // The one case worth naming explicitly: Daily rejects room creation on
            // accounts with no payment method on file, even within the free tier.
            const isMissingPayment = /payment[- ]method/i.test(detail);
            const message = isMissingPayment
                ? 'Your Daily account needs a payment method before rooms can be created. Add one at dashboard.daily.co → Billing (the free tier still requires a card on file).'
                : `Could not create the class room — Daily said: ${reason || detail.slice(0, 200) || created.status}`;

            throw Object.assign(new Error(message), { status: 502, detail: detail.slice(0, 500) });
        }

        const room = await created.json() as { url: string };
        return { url: room.url, name };
    }
}
