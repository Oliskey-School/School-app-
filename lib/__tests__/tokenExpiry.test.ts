/**
 * Regression guard for the pre-flight token-refresh decision (lib/api.ts).
 *
 * The transient 401 on /api/notifications/me happened because requests went out
 * with an already-expired access token. The client now refreshes before sending
 * when getJwtExpiryMs() reports the token is expired/near-expiry. These tests pin
 * the decode logic (base64url payloads, exp→ms, and graceful nulls for non-JWTs
 * like the static demo token) so that decision can't silently regress.
 */
import { describe, it, expect } from 'vitest';
import { getJwtExpiryMs } from '../tokenUtils';

// Build an unsigned JWT (header.payload.signature) with the given exp (seconds).
function makeJwt(expSeconds: number): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'u1', exp: expSeconds })}.sig`;
}

describe('getJwtExpiryMs', () => {
  it('returns the exp in ms for a valid JWT', () => {
    const exp = Math.floor(Date.now() / 1000) + 900; // +15 min
    expect(getJwtExpiryMs(makeJwt(exp))).toBe(exp * 1000);
  });

  it('reports an expired token as in the past (triggers pre-flight refresh)', () => {
    const exp = Math.floor(Date.now() / 1000) - 60; // expired 1 min ago
    const expMs = getJwtExpiryMs(makeJwt(exp))!;
    expect(expMs).toBeLessThan(Date.now());
    // The client refreshes when within a 15s skew — an expired token clearly qualifies.
    expect(expMs - Date.now()).toBeLessThan(15000);
  });

  it('returns null for the static demo token (not a JWT) — no refresh attempted', () => {
    expect(getJwtExpiryMs('demo-auth-token-admin')).toBeNull();
  });

  it('returns null for null / malformed / non-exp tokens', () => {
    expect(getJwtExpiryMs(null)).toBeNull();
    expect(getJwtExpiryMs('a.b')).toBeNull();              // wrong segment count
    expect(getJwtExpiryMs('a.b.c')).toBeNull();            // payload not base64 JSON
    const noExp = `${btoa('{}')}.${btoa(JSON.stringify({ sub: 'x' }))}.s`;
    expect(getJwtExpiryMs(noExp)).toBeNull();              // valid JSON, no exp claim
  });
});
