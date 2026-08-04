// Video-call provider selection for live classes / conferences.
//
// Three modes, in priority order:
//
//   'daily'            — Daily.co. Embeds cleanly in-app, no moderator login.
//                        Rooms are created by OUR backend (Daily's API key must
//                        stay server-side, per their docs), so the browser never
//                        sees the key. Enable with VITE_VIDEO_PROVIDER=daily.
//
//   'jitsi-selfhosted' — Your own Jitsi server (see deploy/jitsi/README.md).
//                        Embeds in-app because you control the server.
//                        Enable by setting VITE_JITSI_DOMAIN to your domain.
//
//   'jitsi-public'     — Legacy fallback: the free meet.jit.si, opened in a
//                        separate browser tab. NOT really usable anymore —
//                        Jitsi disconnects embedded calls after 5 minutes AND
//                        now requires a logged-in moderator before a meeting
//                        can start — but kept as the default so nothing hard
//                        breaks before a real provider is configured.
export type VideoProvider = 'daily' | 'jitsi-selfhosted' | 'jitsi-public';

const env = (import.meta as any).env || {};

export const JITSI_DOMAIN: string = env.VITE_JITSI_DOMAIN || 'meet.jit.si';

export const getVideoProvider = (): VideoProvider => {
    if ((env.VITE_VIDEO_PROVIDER || '').toLowerCase() === 'daily') return 'daily';
    if (JITSI_DOMAIN && JITSI_DOMAIN !== 'meet.jit.si') return 'jitsi-selfhosted';
    return 'jitsi-public';
};

/** True when the call can be embedded directly in the app (no new tab). */
export const canEmbedVideo = (): boolean => getVideoProvider() !== 'jitsi-public';

// Kept for the existing Jitsi call sites that only care about self-hosting.
export const isSelfHostedJitsi = (): boolean => getVideoProvider() === 'jitsi-selfhosted';
