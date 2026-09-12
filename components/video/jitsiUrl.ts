import { JITSI_DOMAIN } from '../../lib/videoConfig';

// Split out of LiveClassRoom.tsx so callers that only need a URL string (e.g.
// ConferenceScheduling's "copy invite link") don't drag in LiveClassRoom's
// module graph — which statically imports DailyClassRoom, and with it the
// entire @daily-co/daily-js SDK, into their bundle chunk.
const roomNameFor = (sessionId: string) => `OliskeyClass${sessionId.replace(/-/g, '')}`;

// IMPORTANT — the free public meet.jit.si must open in a new browser tab, NOT
// in an iframe. It detects any iframe embedding (not just External API) and
// disconnects the call after 5 minutes ("for demonstration purposes only") —
// a deliberate anti-embedding policy Jitsi added in 2023, confirmed against
// their own community announcement, not something any client-side fix can
// bypass. Opening a named window avoids it entirely; the named target means
// repeated "Reopen" clicks reuse the same tab. Once a self-hosted (or JaaS)
// domain is configured via VITE_JITSI_DOMAIN, this restriction doesn't apply
// and the call embeds directly in-app instead — see LiveClassRoom's embedded branch.
export const buildJitsiUrl = (sessionId: string, displayName: string): string => {
    const room = roomNameFor(sessionId);
    const name = encodeURIComponent(`"${displayName || 'Participant'}"`);
    return (
        `https://${JITSI_DOMAIN}/${room}` +
        `#userInfo.displayName=${name}` +
        `&config.prejoinPageEnabled=false` +
        `&config.prejoinConfig.enabled=false` +
        `&config.startAsModerator=true` +
        `&config.disableVirtualBackground=true` +
        `&config.startWithAudioMuted=false` +
        `&config.startWithVideoMuted=false`
    );
};
